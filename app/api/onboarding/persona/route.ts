import { NextResponse } from "next/server";
import { createPersonaInquiry } from "@/src/integrations/persona/client";
import { getAuthenticatedScope } from "@/src/lib/auth-scope";
import { createSupabaseOnboardingRepository } from "@/src/repositories/supabase-onboarding-repository";

export async function GET() {
  try {
    const onboarding = await createSupabaseOnboardingRepository().get((await getAuthenticatedScope()).businessId);
    return NextResponse.json({ onboarding });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load onboarding" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { businessName?: string; ownerName?: string; ownerEmail?: string };
    const businessName = body.businessName?.trim();
    const ownerName = body.ownerName?.trim();
    const ownerEmail = body.ownerEmail?.trim();
    if (!businessName || !ownerName || !ownerEmail) return NextResponse.json({ error: "Business name, owner name, and owner email are required" }, { status: 400 });

    const scope = await getAuthenticatedScope();
    const repository = createSupabaseOnboardingRepository();
    const existing = await repository.get(scope.businessId);
    if (existing) {
      const inquiryId = existing.ownerInquiryId ?? existing.businessInquiryId;
      return NextResponse.json({ onboarding: existing, links: {
        business: null,
        owner: inquiryId ? `https://inquiry.withpersona.com/verify?inquiry-id=${inquiryId}` : null,
      } });
    }

    const templateId = process.env.PERSONA_INQUIRY_TEMPLATE_ID ?? process.env.PERSONA_OWNER_INQUIRY_TEMPLATE_ID ?? process.env.PERSONA_BUSINESS_INQUIRY_TEMPLATE_ID;
    if (!templateId) return NextResponse.json({ error: "Persona inquiry template ID is not configured" }, { status: 503 });

    // The configured fallback is a KYC template whose field schema is provider-owned.
    // Let the hosted flow collect the fields instead of sending KYB-specific names.
    const inquiry = await createPersonaInquiry({ templateId, referenceId: `${scope.businessId}:kyc` });
    const onboarding = await repository.start({ ...scope, businessName, ownerName, ownerEmail, businessInquiryId: inquiry.id, ownerInquiryId: inquiry.id });
    return NextResponse.json({ onboarding, links: { business: null, owner: inquiry.hostedFlowUrl } }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to start Persona verification" }, { status: 502 });
  }
}
