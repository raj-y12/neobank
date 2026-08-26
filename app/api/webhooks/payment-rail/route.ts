import { NextResponse } from "next/server";
import { canTransitionPayment } from "@/src/domain/payment-lifecycle";
import { createClient } from "@supabase/supabase-js";
import { releaseOutboundPayment, reverseInboundFunding, reverseOutboundPayment, settleInboundFunding, settleOutboundPayment } from "@/src/domain/ledger";
import { orderPaymentRailEvents, type PaymentRailLifecycleEvent } from "@/src/domain/payment-rail-events";

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
      const events = orderPaymentRailEvents((history ?? []).map((event) => ({
        providerEventId: event.provider_event_id,
        status: event.event_type as PaymentRailLifecycleEvent["status"],
        occurredAt: event.occurred_at ?? event.created_at,
        receivedAt: event.created_at,
      })));
      const { data: payment, error: paymentReadError } = await client.from("payments").select("business_id,account_id,amount_cents,status").eq("id", payload.paymentId).single();
      if (paymentReadError) throw paymentReadError;
      for (const event of events) {
        if (event.status === "SUBMITTED") {
          if (payment.status === "APPROVED") payment.status = "SUBMITTED";
          continue;
        }
        if (!canTransitionPayment(payment.status, event.status)) continue;
        const valueDate = event.occurredAt.slice(0, 10);
        const entry = event.status === "SETTLED"
          ? settleOutboundPayment(payment.amount_cents, payload.paymentId, valueDate)
          : payment.status === "SETTLED"
            ? reverseOutboundPayment(payment.amount_cents, event.providerEventId, payload.paymentId, valueDate)
            : releaseOutboundPayment(payment.amount_cents, event.providerEventId, payload.paymentId, valueDate);
        const { error: journalError } = await client.rpc("record_journal_entry", { p_entry_type: entry.entryType, p_value_date: entry.valueDate, p_reference_id: entry.referenceId ?? null, p_reversal_of_reference_id: entry.reversalOfReferenceId ?? null, p_idempotency_key: `payment-event:${event.providerEventId}`, p_business_id: payment.business_id, p_account_id: payment.account_id, p_postings: entry.postings.map((posting) => ({ accountCode: posting.accountCode, debitCents: posting.debitCents, creditCents: posting.creditCents })) });
        if (journalError) throw journalError;
        payment.status = event.status;
      }
      const { error } = await client.from("payments").update({ status: payment.status, updated_at: receivedAt }).eq("id", payload.paymentId);
      if (error) throw error;
    }
    if (payload.fundingTransferId) {
      const { data: history, error: historyError } = await client.from("payment_events")
        .select("provider_event_id,event_type,occurred_at,created_at")
        .eq("funding_transfer_id", payload.fundingTransferId).eq("provider", "ACH");
      if (historyError) throw historyError;
      const events = orderPaymentRailEvents((history ?? []).map((event) => ({ providerEventId: event.provider_event_id, status: event.event_type as PaymentRailLifecycleEvent["status"], occurredAt: event.occurred_at ?? event.created_at, receivedAt: event.created_at })));
      const { data: funding, error: fundingReadError } = await client.from("funding_transfers").select("business_id,account_id,amount_cents,status").eq("id", payload.fundingTransferId).single();
      if (fundingReadError) throw fundingReadError;
      for (const event of events) {
        if (event.status === "SUBMITTED") continue;
        const canSettle = event.status === "SETTLED" && funding.status === "PENDING";
        const canReturn = event.status === "RETURNED" && (funding.status === "PENDING" || funding.status === "SETTLED");
        if (!canSettle && !canReturn) continue;
        const entry = event.status === "SETTLED"
          ? settleInboundFunding(funding.amount_cents, payload.fundingTransferId, event.occurredAt.slice(0, 10))
          : reverseInboundFunding(funding.amount_cents, event.providerEventId, payload.fundingTransferId, event.occurredAt.slice(0, 10));
        const { error: journalError } = await client.rpc("record_journal_entry", { p_entry_type: entry.entryType, p_value_date: entry.valueDate, p_reference_id: entry.referenceId ?? null, p_reversal_of_reference_id: entry.reversalOfReferenceId ?? null, p_idempotency_key: `funding-event:${event.providerEventId}`, p_business_id: funding.business_id, p_account_id: funding.account_id, p_postings: entry.postings.map((posting) => ({ accountCode: posting.accountCode, debitCents: posting.debitCents, creditCents: posting.creditCents })) });
        if (journalError) throw journalError;
        funding.status = event.status;
      }
      const { error } = await client.from("funding_transfers").update({ status: funding.status, updated_at: receivedAt, ...(funding.status === "SETTLED" ? { settled_at: receivedAt } : funding.status === "RETURNED" ? { returned_at: receivedAt } : {}) }).eq("id", payload.fundingTransferId);
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
