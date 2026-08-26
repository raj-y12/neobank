import { isBusinessApproved } from "../domain/onboarding";
import { createSupabaseOnboardingRepository } from "../repositories/supabase-onboarding-repository";

export async function isBusinessApprovedForBusiness(businessId: string) {
  return isBusinessApproved(await createSupabaseOnboardingRepository().get(businessId));
}
