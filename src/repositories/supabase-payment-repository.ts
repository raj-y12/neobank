import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Payment } from "../domain/payment-lifecycle";

type PaymentRow = {
  id: string;
  business_id: string;
  account_id: string;
  initiator_member_id: string;
  amount_cents: number;
  currency: "USD";
  rail: "ACH";
  recipient: string | { name?: string };
  status: Payment["status"];
};

export class SupabasePaymentRepository {
  constructor(private readonly client: SupabaseClient) {}

  async create(payment: Payment, idempotencyKey: string) {
    const { error } = await this.client.from("payments").insert({
      id: payment.id,
      business_id: payment.businessId,
      account_id: payment.accountId,
      initiator_member_id: payment.initiatorId,
      provider: "ACH",
      amount_cents: payment.amountCents,
      currency: payment.currency,
      rail: payment.rail,
      recipient: { name: payment.recipient },
      status: payment.status,
      idempotency_key: idempotencyKey,
    });
    if (error && error.code !== "23505") throw error;
  }

  async get(id: string, businessId: string): Promise<Payment | null> {
    const { data, error } = await this.client.from("payments").select("id,business_id,account_id,initiator_member_id,amount_cents,currency,rail,recipient,status").eq("id", id).eq("business_id", businessId).maybeSingle<PaymentRow>();
    if (error) throw error;
    if (!data) return null;
    return { id: data.id, businessId: data.business_id, accountId: data.account_id, initiatorId: data.initiator_member_id, amountCents: data.amount_cents, currency: data.currency, rail: "ACH", recipient: typeof data.recipient === "string" ? data.recipient : data.recipient.name ?? "Unknown", status: data.status };
  }

  async setStatus(id: string, businessId: string, status: Payment["status"]) {
    const { error } = await this.client.from("payments").update({ status, updated_at: new Date().toISOString() }).eq("id", id).eq("business_id", businessId);
    if (error) throw error;
  }

  async setProviderTransfer(id: string, businessId: string, providerTransferId: string, status: Payment["status"]) {
    const { error } = await this.client.from("payments").update({ provider_payment_id: providerTransferId, status, updated_at: new Date().toISOString() }).eq("id", id).eq("business_id", businessId);
    if (error) throw error;
  }

  async addApproval(id: string, approverMemberId: string, decision: "APPROVED" | "REJECTED", note?: string) {
    const { error } = await this.client.from("payment_approvals").insert({ payment_id: id, approver_member_id: approverMemberId, decision, note: note ?? null });
    if (error) throw error;
  }

  async memberBelongsToBusiness(memberId: string, businessId: string) {
    const { data, error } = await this.client.from("business_members").select("id").eq("id", memberId).eq("business_id", businessId).maybeSingle();
    if (error) throw error;
    return Boolean(data);
  }
}

export function createSupabasePaymentRepository() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase payment storage is not configured");
  return new SupabasePaymentRepository(createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } }));
}
