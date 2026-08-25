import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { FundingTransfer } from "../domain/payment-lifecycle";

export class SupabaseFundingRepository {
  constructor(private readonly client: SupabaseClient) {}

  async create(funding: FundingTransfer, providerTransferId: string, idempotencyKey: string) {
    const { error } = await this.client.from("funding_transfers").insert({ id: funding.id, business_id: funding.businessId, account_id: funding.accountId, linked_funding_account_id: funding.linkedFundingAccountId, provider: "INCREASE", provider_transfer_id: providerTransferId, amount_cents: funding.amountCents, currency: "USD", status: funding.status, idempotency_key: idempotencyKey });
    if (error && error.code !== "23505") throw error;
  }
}

export function createSupabaseFundingRepository() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase funding storage is not configured");
  return new SupabaseFundingRepository(createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } }));
}
