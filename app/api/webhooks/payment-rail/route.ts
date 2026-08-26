import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { releaseOutboundPayment, reverseInboundFunding, reverseOutboundPayment, settleInboundFunding, settleOutboundPayment } from "@/src/domain/ledger";
import { replayFundingRailLifecycle, replayPaymentRailLifecycle, type PaymentRailLifecycleEvent } from "@/src/domain/payment-rail-events";
import { isUuid } from "@/src/lib/identifiers";

export type PaymentRailEventPayload = {
  providerEventId?: string;
  transferId?: string;
  status?: "SUBMITTED" | "SETTLED" | "RETURNED";
  paymentId?: string;
  fundingTransferId?: string;
  occurredAt?: string;
};

export async function processPaymentRailEvent(payload: PaymentRailEventPayload) {
  if (!payload.providerEventId || !payload.status || (!payload.paymentId && !payload.fundingTransferId)) throw new Error("providerEventId, status, and a payment/funding transfer id are required");
  if (payload.paymentId && payload.fundingTransferId) throw new Error("A payment rail event cannot target both a payment and a funding transfer");
  if (!(["SUBMITTED", "SETTLED", "RETURNED"] as const).includes(payload.status)) throw new Error("Unsupported payment rail event status");
  if (payload.paymentId && !isUuid(payload.paymentId)) throw new Error("Payment not found");
  if (payload.fundingTransferId && !isUuid(payload.fundingTransferId)) throw new Error("Funding transfer not found");
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase payment storage is not configured");
  const client = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const { error: eventError } = await client.from("payment_events").insert({ payment_id: payload.paymentId ?? null, funding_transfer_id: payload.fundingTransferId ?? null, provider: "ACH", provider_event_id: payload.providerEventId, event_type: payload.status, occurred_at: payload.occurredAt ?? new Date().toISOString(), payload });
  if (eventError && eventError.code !== "23505") throw eventError;
  const receivedAt = new Date().toISOString();
  if (payload.paymentId) {
    const { data: history, error: historyError } = await client.from("payment_events")
      .select("provider_event_id,event_type,occurred_at,created_at")
      .eq("payment_id", payload.paymentId).eq("provider", "ACH");
    if (historyError) throw historyError;
    const events = (history ?? []).map((event) => ({ providerEventId: event.provider_event_id, status: event.event_type as PaymentRailLifecycleEvent["status"], occurredAt: event.occurred_at ?? event.created_at, receivedAt: event.created_at }));
    const { data: payment, error: paymentReadError } = await client.from("payments").select("business_id,account_id,amount_cents,status").eq("id", payload.paymentId).single();
    if (paymentReadError) throw paymentReadError;
    const replay = replayPaymentRailLifecycle(payment.status, events);
    for (const transition of replay.transitions) {
      if (transition.toStatus === "SUBMITTED") continue;
      const valueDate = transition.event.occurredAt.slice(0, 10);
      const entry = transition.toStatus === "SETTLED"
        ? settleOutboundPayment(payment.amount_cents, payload.paymentId, valueDate)
        : transition.fromStatus === "SETTLED"
          ? reverseOutboundPayment(payment.amount_cents, transition.event.providerEventId, payload.paymentId, valueDate)
          : releaseOutboundPayment(payment.amount_cents, transition.event.providerEventId, payload.paymentId, valueDate);
      const { error: journalError } = await client.rpc("record_journal_entry", { p_entry_type: entry.entryType, p_value_date: entry.valueDate, p_reference_id: entry.referenceId ?? null, p_reversal_of_reference_id: entry.reversalOfReferenceId ?? null, p_idempotency_key: `payment-event:${transition.event.providerEventId}`, p_business_id: payment.business_id, p_account_id: payment.account_id, p_postings: entry.postings.map((posting) => ({ accountCode: posting.accountCode, debitCents: posting.debitCents, creditCents: posting.creditCents })) });
      if (journalError) throw journalError;
    }
    const { error } = await client.from("payments").update({ status: replay.status, updated_at: receivedAt }).eq("id", payload.paymentId);
    if (error) throw error;
  }
  if (payload.fundingTransferId) {
    const { data: history, error: historyError } = await client.from("payment_events")
      .select("provider_event_id,event_type,occurred_at,created_at")
      .eq("funding_transfer_id", payload.fundingTransferId).eq("provider", "ACH");
    if (historyError) throw historyError;
    const events = (history ?? []).map((event) => ({ providerEventId: event.provider_event_id, status: event.event_type as PaymentRailLifecycleEvent["status"], occurredAt: event.occurred_at ?? event.created_at, receivedAt: event.created_at }));
    const { data: funding, error: fundingReadError } = await client.from("funding_transfers").select("business_id,account_id,amount_cents,status").eq("id", payload.fundingTransferId).single();
    if (fundingReadError) throw fundingReadError;
    const replay = replayFundingRailLifecycle(funding.status, events);
    for (const transition of replay.transitions) {
      const valueDate = transition.event.occurredAt.slice(0, 10);
      const entry = transition.toStatus === "SETTLED"
        ? settleInboundFunding(funding.amount_cents, payload.fundingTransferId, valueDate)
        : reverseInboundFunding(funding.amount_cents, transition.event.providerEventId, payload.fundingTransferId, valueDate);
      const { error: journalError } = await client.rpc("record_journal_entry", { p_entry_type: entry.entryType, p_value_date: entry.valueDate, p_reference_id: entry.referenceId ?? null, p_reversal_of_reference_id: entry.reversalOfReferenceId ?? null, p_idempotency_key: `funding-event:${transition.event.providerEventId}`, p_business_id: funding.business_id, p_account_id: funding.account_id, p_postings: entry.postings.map((posting) => ({ accountCode: posting.accountCode, debitCents: posting.debitCents, creditCents: posting.creditCents })) });
      if (journalError) throw journalError;
    }
    const { error } = await client.from("funding_transfers").update({ status: replay.status, updated_at: receivedAt, ...(replay.status === "SETTLED" ? { settled_at: receivedAt } : replay.status === "RETURNED" ? { returned_at: receivedAt } : {}) }).eq("id", payload.fundingTransferId);
    if (error) throw error;
  }
  return { accepted: true, idempotent: eventError?.code === "23505" };
}

export async function POST(request: Request) {
  try {
    const secret = process.env.PAYMENT_RAIL_INTERNAL_SECRET;
    if (!secret || request.headers.get("x-payment-rail-secret") !== secret) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const payload = await request.json() as PaymentRailEventPayload;
    return NextResponse.json(await processPaymentRailEvent(payload));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to process payment-rail event" }, { status: 400 });
  }
}
