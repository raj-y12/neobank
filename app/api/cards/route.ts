import { NextResponse } from "next/server";
import { isBusinessApproved } from "@/src/domain/onboarding";
import { createLithicVirtualCard } from "@/src/integrations/lithic/client";
import { getAuthenticatedScope } from "@/src/lib/auth-scope";
import { createSupabaseOnboardingRepository } from "@/src/repositories/supabase-onboarding-repository";

export async function POST() {
  try {
    const onboarding = await createSupabaseOnboardingRepository().get((await getAuthenticatedScope()).businessId);
    if (!isBusinessApproved(onboarding)) return NextResponse.json({ error: "Business verification must be approved before issuing a card" }, { status: 403 });
    const card = await createLithicVirtualCard();
    return NextResponse.json({ card }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to issue card";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
