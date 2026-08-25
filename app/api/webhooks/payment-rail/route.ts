import { NextResponse } from "next/server";
import { canTransitionPayment } from "@/src/domain/payment-lifecycle";
import { createClient } from "@supabase/supabase-js";
import { reverseInboundFunding, reverseOutboundPayment, settleInboundFunding, settleOutboundPayment } from "@/src/domain/ledger";

export type PaymentRailEventPayload = {
  providerEventId?: string;
  transferId?: string;
  status?: "SUBMITTED" | "SETTLED" | "RETURNED";
  paymentId?: string;
  fundingTransferId?: string;
};

export async function processPaymentRailEvent(payload: PaymentRailEventPayload) {
  if (!payload.providerEventId || !payload.status || (!payload.paymentId && !payload.fundingTransferId)) throw new Error("providerEventId, status, and a payment/funding transfer id are required");
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Supabase payment storage is not configured");
    const client = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
    const { error: eventError } = await client.from("payment_events").insert({ payment_id: payload.paymentId ?? null, funding_transfer_id: payload.fundingTransferId ?? null, provider: "ACH", provider_event_id: payload.providerEventId, event_type: payload.status, payload });
    if (eventError && eventError.code !== "23505") throw eventError;
    if (eventError?.code === "23505") return { accepted: true, idempotent: true };
    if (payload.paymentId) {
      const { data: payment, error: paymentReadError } = await client.from("payments").select("business_id,account_id,amount_cents,status").eq("id", payload.paymentId).single();
      if (paymentReadError) throw paymentReadError;
      if (payload.status === "SUBMITTED") {
        if (payment.status === "APPROVED") {
          const { error } = await client.from("payments").update({ status: "SUBMITTED", updated_at: new Date().toISOString() }).eq("id", payload.paymentId);
          if (error) throw error;
        }
      } else if (canTransitionPayment(payment.status, payload.status)) {
        const entry = payload.status === "SETTLED"
          ? settleOutboundPayment(payment.amount_cents, payload.paymentId, new Date().toISOString().slice(0, 10))
          : reverseOutboundPayment(payment.amount_cents, payload.providerEventId, payload.paymentId, new Date().toISOString().slice(0, 10));
        const { error: journalError } = await client.rpc("record_journal_entry", { p_entry_type: entry.entryType, p_value_date: entry.valueDate, p_reference_id: entry.referenceId ?? null, p_reversal_of_reference_id: entry.reversalOfReferenceId ?? null, p_idempotency_key: `payment-event:${payload.providerEventId}`, p_business_id: payment.business_id, p_account_id: payment.account_id, p_postings: entry.postings.map((posting) => ({ accountCode: posting.accountCode, debitCents: posting.debitCents, creditCents: posting.creditCents })) });
        if (journalError) throw journalError;
        const { error } = await client.from("payments").update({ status: payload.status, updated_at: new Date().toISOString() }).eq("id", payload.paymentId);
        if (error) throw error;
      }
    }
    if (payload.fundingTransferId) {
      const { data: funding, error: fundingReadError } = await client.from("funding_transfers").select("business_id,account_id,amount_cents,status").eq("id", payload.fundingTransferId).single();
      if (fundingReadError) throw fundingReadError;
      if (payload.status !== "SUBMITTED" && funding.status === "PENDING") {
        const entry = payload.status === "SETTLED"
          ? settleInboundFunding(funding.amount_cents, payload.fundingTransferId, new Date().toISOString().slice(0, 10))
          : reverseInboundFunding(funding.amount_cents, payload.providerEventId, payload.fundingTransferId, new Date().toISOString().slice(0, 10));
        const { error: journalError } = await client.rpc("record_journal_entry", { p_entry_type: entry.entryType, p_value_date: entry.valueDate, p_reference_id: entry.referenceId ?? null, p_reversal_of_reference_id: entry.reversalOfReferenceId ?? null, p_idempotency_key: `funding-event:${payload.providerEventId}`, p_business_id: funding.business_id, p_account_id: funding.account_id, p_postings: entry.postings.map((posting) => ({ accountCode: posting.accountCode, debitCents: posting.debitCents, creditCents: posting.creditCents })) });
        if (journalError) throw journalError;
        const { error } = await client.from("funding_transfers").update({ status: payload.status, updated_at: new Date().toISOString(), ...(payload.status === "SETTLED" ? { settled_at: new Date().toISOString() } : { returned_at: new Date().toISOString() }) }).eq("id", payload.fundingTransferId);
        if (error) throw error;
      }
    }
    return { accepted: true, idempotent: false };
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
