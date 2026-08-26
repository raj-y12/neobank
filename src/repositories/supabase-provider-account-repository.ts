import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ProviderAccount, ProviderAccountRepository } from "./provider-account-repository";

type ProviderAccountRow = {
  id: string;
  business_id: string;
  account_id: string;
  provider: "INCREASE";
  provider_account_id: string;
  provider_account_number_id: string | null;
  status: ProviderAccount["status"];
};

export class SupabaseProviderAccountRepository implements ProviderAccountRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getActiveIncrease(businessId: string, accountId: string) {
    const { data, error } = await this.client
      .from("provider_accounts")
      .select("id,business_id,account_id,provider,provider_account_id,provider_account_number_id,status")
      .eq("business_id", businessId)
      .eq("account_id", accountId)
      .eq("provider", "INCREASE")
      .eq("status", "ACTIVE")
      .maybeSingle<ProviderAccountRow>();
    if (error) throw error;
    return data ? {
      id: data.id,
      businessId: data.business_id,
      accountId: data.account_id,
      provider: data.provider,
      providerAccountId: data.provider_account_id,
      providerAccountNumberId: data.provider_account_number_id,
      status: data.status,
    } : null;
  }
}

export function createSupabaseProviderAccountRepository() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error("Supabase provider account storage is not configured");
  return new SupabaseProviderAccountRepository(createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } }));
}
