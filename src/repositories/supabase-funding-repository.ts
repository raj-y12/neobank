import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { FundingTransfer } from "../domain/payment-lifecycle";
import { decryptPlaidAccessToken, encryptPlaidAccessToken, getPlaidAuthNumbers } from "../integrations/plaid/client";

type FundingRow = {
  id: string;
  business_id: string;
  account_id: string;
  linked_funding_account_id: string;
  amount_cents: number;
  rail: "ACH";
  status: FundingTransfer["status"];
  provider_transfer_id: string | null;
};

export type PersistedFundingTransfer = FundingTransfer & { providerTransferId: string };

const FUNDING_COLUMNS = "id,business_id,account_id,linked_funding_account_id,amount_cents,rail,status,provider_transfer_id";

function toFunding(row: FundingRow): PersistedFundingTransfer {
  if (!row.provider_transfer_id) throw new Error("Funding transfer is missing its provider transfer id");
  return {
    id: row.id,
    businessId: row.business_id,
    accountId: row.account_id,
    linkedFundingAccountId: row.linked_funding_account_id,
    amountCents: row.amount_cents,
    rail: row.rail,
    status: row.status,
    providerTransferId: row.provider_transfer_id,
  };
}

function sameFundingRequest(left: FundingTransfer, right: FundingTransfer) {
  return left.businessId === right.businessId
    && left.accountId === right.accountId
    && left.linkedFundingAccountId === right.linkedFundingAccountId
    && left.amountCents === right.amountCents
    && left.rail === right.rail;
}

export class SupabaseFundingRepository {
  constructor(private readonly client: SupabaseClient) {}

  async create(funding: FundingTransfer, providerTransferId: string, idempotencyKey: string): Promise<PersistedFundingTransfer> {
    const existing = await this.getByIdempotencyKey(funding.businessId, idempotencyKey);
    if (existing) {
      if (!sameFundingRequest(existing, funding)) throw new Error("Idempotency key was already used with different request data");
      return existing;
    }
    const { error } = await this.client.from("funding_transfers").insert({ id: funding.id, business_id: funding.businessId, account_id: funding.accountId, linked_funding_account_id: funding.linkedFundingAccountId, provider: "INCREASE", provider_transfer_id: providerTransferId, amount_cents: funding.amountCents, currency: "USD", status: funding.status, idempotency_key: idempotencyKey });
    if (error && error.code !== "23505") throw error;
    if (error?.code === "23505") {
      const concurrent = await this.getByIdempotencyKey(funding.businessId, idempotencyKey);
      if (concurrent && !sameFundingRequest(concurrent, funding)) throw new Error("Idempotency key was already used with different request data");
      if (!concurrent) throw new Error("Idempotency key was already used with different request data");
      return concurrent;
    }
    return { ...funding, providerTransferId };
  }

  async getByIdempotencyKey(businessId: string, idempotencyKey: string) {
    const { data, error } = await this.client.from("funding_transfers").select(FUNDING_COLUMNS).eq("business_id", businessId).eq("idempotency_key", idempotencyKey).maybeSingle<FundingRow>();
    if (error) throw error;
    return data ? toFunding(data) : null;
  }

  async getSourceDetails(id: string, businessId: string) {
    const { data, error } = await this.client.from("linked_funding_accounts").select("id,provider_access_token,encrypted_account_number,encrypted_routing_number").eq("id", id).eq("business_id", businessId).single<{ id: string; provider_access_token: string; encrypted_account_number: string | null; encrypted_routing_number: string | null }>();
    if (error) throw error;
    let accountNumber: string | null = null;
    let routingNumber: string | null = null;
    if (data.encrypted_account_number && data.encrypted_routing_number) {
      try {
        accountNumber = decryptPlaidAccessToken(data.encrypted_account_number);
        routingNumber = decryptPlaidAccessToken(data.encrypted_routing_number);
      } catch {
        // Values encrypted by a different deployment key are rehydrated below.
      }
    }
    if (!accountNumber || !routingNumber) {
      const numbers = await getPlaidAuthNumbers(decryptPlaidAccessToken(data.provider_access_token));
      const { error: updateError } = await this.client.from("linked_funding_accounts").update({ encrypted_account_number: encryptPlaidAccessToken(numbers.accountNumber), encrypted_routing_number: encryptPlaidAccessToken(numbers.routingNumber), account_name: numbers.accountName ?? null, account_mask: numbers.accountMask ?? null, updated_at: new Date().toISOString() }).eq("id", data.id);
      if (updateError) throw updateError;
      return numbers;
    }
    return { accountNumber, routingNumber };
  }
}

export function createSupabaseFundingRepository() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase funding storage is not configured");
  return new SupabaseFundingRepository(createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } }));
}
