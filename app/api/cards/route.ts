import { NextResponse } from "next/server";
import { isBusinessApproved } from "@/src/domain/onboarding";
import { createLithicVirtualCard } from "@/src/integrations/lithic/client";
import { getAuthenticatedScope } from "@/src/lib/auth-scope";
import { createSupabaseOnboardingRepository } from "@/src/repositories/supabase-onboarding-repository";
import { createBusinessCard } from "@/src/repositories/supabase-business-card-repository";
import { parseCardIssueInput } from "@/src/domain/card-issue";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const scope = await getAuthenticatedScope();
    if (scope.role !== "ADMIN") return NextResponse.json({ error: "ADMIN role required" }, { status: 403 });
    const onboarding = await createSupabaseOnboardingRepository().get(scope.businessId);
    if (!isBusinessApproved(onboarding)) return NextResponse.json({ error: "Business verification must be approved before issuing a card" }, { status: 403 });
    const input = parseCardIssueInput(await request.json() as { memberId?: string; limit?: string; duration?: string });
    const { data: employee, error: employeeError } = await createSupabaseAdminClient().from("business_members").select("id").eq("id", input.memberId).eq("business_id", scope.businessId).eq("status", "ACTIVE").maybeSingle();
    if (employeeError) throw employeeError;
    if (!employee) return NextResponse.json({ error: "Employee is not active in this business" }, { status: 400 });
    const card = await createLithicVirtualCard({ spendLimit: input.spendLimit, spendLimitDuration: input.spendLimitDuration });
    await createBusinessCard({ businessId: scope.businessId, cardToken: card.token, memberId: input.memberId });
    return NextResponse.json({ card }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to issue card";
    const status = /Choose an employee|Limit must be|Unsupported limit duration|Employee is not active/.test(message) ? 400 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
