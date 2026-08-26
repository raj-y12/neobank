import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { FundingAccountRepository, LinkedFundingAccount } from "./funding-account-repository";
import { decryptPlaidAccessToken, encryptPlaidAccessToken, getPlaidAuthNumbers } from "../integrations/plaid/client";

type FundingRow = {
  id: string; business_id: string; account_id: string; provider: string; provider_item_id: string;
  institution_id: string | null; institution_name: string | null; account_name: string | null;
  account_mask: string | null; status: LinkedFundingAccount["status"]; created_at: string; updated_at: string;
};
const columns = "id,business_id,account_id,provider,provider_item_id,institution_id,institution_name,account_name,account_mask,status,created_at,updated_at";
function toAccount(row: FundingRow): LinkedFundingAccount {
  return { id: row.id, businessId: row.business_id, accountId: row.account_id, provider: row.provider, providerItemId: row.provider_item_id, institutionId: row.institution_id, institutionName: row.institution_name, accountName: row.account_name, accountMask: row.account_mask, status: row.status, createdAt: row.created_at, updatedAt: row.updated_at };
}

export class SupabaseFundingAccountRepository implements FundingAccountRepository {
  constructor(private readonly client: SupabaseClient) {}
  async get(businessId: string) {
    const { data, error } = await this.client.from("linked_funding_accounts").select(columns).eq("business_id", businessId).order("updated_at", { ascending: false }).limit(1).maybeSingle<FundingRow>();
    if (error) throw error;
    return data ? toAccount(data) : null;
  }
  async save(input: Parameters<FundingAccountRepository["save"]>[0]) {
    const { data, error } = await this.client.from("linked_funding_accounts").upsert({
      business_id: input.businessId, account_id: input.accountId, provider: "PLAID", provider_item_id: input.providerItemId,
      provider_access_token: encryptPlaidAccessToken(input.providerAccessToken), institution_id: input.institutionId ?? null, institution_name: input.institutionName ?? null,
      account_name: input.accountName ?? null, account_mask: input.accountMask ?? null, status: "LINKED", updated_at: new Date().toISOString(),
      encrypted_account_number: input.accountNumber ? encryptPlaidAccessToken(input.accountNumber) : null,
      encrypted_routing_number: input.routingNumber ? encryptPlaidAccessToken(input.routingNumber) : null,
    }, { onConflict: "provider,provider_item_id" }).select(columns).single<FundingRow>();
    if (error) throw error;
    return toAccount(data);
  }

  async getAchSource(businessId: string) {
    const { data, error } = await this.client.from("linked_funding_accounts").select("id,provider_access_token,encrypted_account_number,encrypted_routing_number").eq("business_id", businessId).single<{ id: string; provider_access_token: string; encrypted_account_number: string | null; encrypted_routing_number: string | null }>();
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

export function createSupabaseFundingAccountRepository() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error("Supabase funding account storage is not configured");
  return new SupabaseFundingAccountRepository(createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } }));
}
