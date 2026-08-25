import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { applySingleInquiryStatus, mergeVerificationStatus, type VerificationStatus } from "../domain/onboarding";
import type { OnboardingRecord, OnboardingRepository } from "./onboarding-repository";

type OnboardingRow = {
  id: string;
  business_id: string;
  account_id: string;
  business_name: string;
  owner_name: string;
  owner_email: string;
  persona_business_inquiry_id: string | null;
  persona_owner_inquiry_id: string | null;
  business_status: VerificationStatus;
  owner_status: VerificationStatus;
  created_at: string;
  updated_at: string;
};

function toRecord(row: OnboardingRow): OnboardingRecord {
  return {
    id: row.id,
    businessId: row.business_id,
    accountId: row.account_id,
    businessName: row.business_name,
    ownerName: row.owner_name,
    ownerEmail: row.owner_email,
    businessInquiryId: row.persona_business_inquiry_id,
    ownerInquiryId: row.persona_owner_inquiry_id,
    businessStatus: row.business_status,
    ownerStatus: row.owner_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const columns = "id,business_id,account_id,business_name,owner_name,owner_email,persona_business_inquiry_id,persona_owner_inquiry_id,business_status,owner_status,created_at,updated_at";

export class SupabaseOnboardingRepository implements OnboardingRepository {
  constructor(private readonly client: SupabaseClient) {}

  async get(businessId: string) {
    const { data, error } = await this.client.from("business_onboarding").select(columns).eq("business_id", businessId).maybeSingle<OnboardingRow>();
    if (error) throw error;
    return data ? toRecord(data) : null;
  }

  async start(input: Parameters<OnboardingRepository["start"]>[0]) {
    const { data, error } = await this.client.from("business_onboarding").upsert({
      business_id: input.businessId,
      account_id: input.accountId,
      business_name: input.businessName,
      owner_name: input.ownerName,
      owner_email: input.ownerEmail,
      persona_business_inquiry_id: input.businessInquiryId,
      persona_owner_inquiry_id: input.ownerInquiryId,
    }, { onConflict: "business_id" }).select(columns).single<OnboardingRow>();
    if (error) throw error;
    return toRecord(data);
  }

  async updateInquiryStatus(inquiryId: string, status: VerificationStatus) {
    const { data: current, error: lookupError } = await this.client
      .from("business_onboarding")
      .select(columns)
      .or(`persona_business_inquiry_id.eq.${inquiryId},persona_owner_inquiry_id.eq.${inquiryId}`)
      .maybeSingle<OnboardingRow>();
    if (lookupError) throw lookupError;
    if (!current) return null;
    const isBusiness = current.persona_business_inquiry_id === inquiryId;
    const isSingleInquiry = current.persona_business_inquiry_id === current.persona_owner_inquiry_id;
    const next = isSingleInquiry
      ? applySingleInquiryStatus({ businessStatus: current.business_status, ownerStatus: current.owner_status }, status)
      : { businessStatus: isBusiness ? mergeVerificationStatus(current.business_status, status) : current.business_status, ownerStatus: isBusiness ? current.owner_status : mergeVerificationStatus(current.owner_status, status) };
    const { data, error } = await this.client.from("business_onboarding").update({
      business_status: next.businessStatus,
      owner_status: next.ownerStatus,
      updated_at: new Date().toISOString(),
    }).eq("id", current.id).select(columns).single<OnboardingRow>();
    if (error) throw error;
    return toRecord(data);
  }
}

export function createSupabaseOnboardingRepository() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error("Supabase onboarding storage is not configured");
  return new SupabaseOnboardingRepository(createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } }));
}
