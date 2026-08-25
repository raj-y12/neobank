import { NextResponse } from "next/server";
import { getAuthenticatedScope } from "@/src/lib/auth-scope";
import { createSupabaseFundingAccountRepository } from "@/src/repositories/supabase-funding-account-repository";
import { createSupabaseOnboardingRepository } from "@/src/repositories/supabase-onboarding-repository";

export async function GET() {
  try {
    const scope = await getAuthenticatedScope();
    const [onboarding, funding] = await Promise.all([
      createSupabaseOnboardingRepository().get(scope.businessId),
      createSupabaseFundingAccountRepository().get(scope.businessId),
    ]);
    return NextResponse.json({
      authenticated: true,
      onboardingApproved: onboarding?.businessStatus === "APPROVED" && onboarding.ownerStatus === "APPROVED",
      fundingLinked: Boolean(funding),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load navigation status" }, { status: 401 });
  }
}
