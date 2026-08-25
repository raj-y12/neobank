import { NextResponse } from "next/server";
import { isBusinessApproved } from "@/src/domain/onboarding";
import { exchangePlaidPublicToken, getPlaidItem } from "@/src/integrations/plaid/client";
import { getAuthenticatedScope } from "@/src/lib/auth-scope";
import { createSupabaseOnboardingRepository } from "@/src/repositories/supabase-onboarding-repository";
import { createSupabaseFundingAccountRepository } from "@/src/repositories/supabase-funding-account-repository";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { publicToken?: string; accountName?: string; accountMask?: string };
    if (!body.publicToken) return NextResponse.json({ error: "publicToken is required" }, { status: 400 });
    const scope = await getAuthenticatedScope();
    const onboarding = await createSupabaseOnboardingRepository().get(scope.businessId);
    if (!isBusinessApproved(onboarding)) return NextResponse.json({ error: "Business verification must be approved before linking a bank" }, { status: 403 });
    const exchanged = await exchangePlaidPublicToken(body.publicToken);
    const item = await getPlaidItem(exchanged.access_token);
    const account = await createSupabaseFundingAccountRepository().save({
      ...scope,
      providerItemId: exchanged.item_id,
      providerAccessToken: exchanged.access_token,
      institutionId: item.item.institution_id,
      institutionName: item.item.institution_name,
      accountName: body.accountName,
      accountMask: body.accountMask,
    });
    return NextResponse.json({ account }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to link bank account" }, { status: 502 });
  }
}
