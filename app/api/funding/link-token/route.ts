import { NextResponse } from "next/server";
import { isBusinessApproved } from "@/src/domain/onboarding";
import { createPlaidLinkToken } from "@/src/integrations/plaid/client";
import { getAuthenticatedScope } from "@/src/lib/auth-scope";
import { createSupabaseOnboardingRepository } from "@/src/repositories/supabase-onboarding-repository";

export async function POST() {
  try {
    const scope = await getAuthenticatedScope();
    if (scope.role !== "ADMIN") return NextResponse.json({ error: "ADMIN role required" }, { status: 403 });
    const onboarding = await createSupabaseOnboardingRepository().get(scope.businessId);
    if (!isBusinessApproved(onboarding)) return NextResponse.json({ error: "Business verification must be approved before linking a bank" }, { status: 403 });
    const response = await createPlaidLinkToken({ businessId: scope.businessId });
    return NextResponse.json({ linkToken: response.link_token, expiration: response.expiration });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create Plaid Link token" }, { status: 502 });
  }
}
