import { NextResponse } from "next/server";
import { normalizePersonaStatus } from "@/src/domain/onboarding";
import { verifyPersonaSignature } from "@/src/integrations/persona/webhook-verification";
import { createSupabaseOnboardingRepository } from "@/src/repositories/supabase-onboarding-repository";
import { createSupabaseProviderEventRepository } from "@/src/repositories/supabase-provider-event-repository";

type PersonaWebhook = {
  data?: {
    id?: string;
    attributes?: {
      name?: string;
      payload?: { data?: { id?: string; attributes?: { status?: string } } };
    };
  };
};

export async function POST(request: Request) {
  const rawBody = await request.text();
  const secret = process.env.PERSONA_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "PERSONA_WEBHOOK_SECRET is not configured" }, { status: 503 });
  if (!verifyPersonaSignature(rawBody, request.headers.get("persona-signature"), secret)) return NextResponse.json({ error: "Invalid Persona signature" }, { status: 401 });

  try {
    const payload = JSON.parse(rawBody) as PersonaWebhook;
    const eventId = payload.data?.id;
    const inquiryId = payload.data?.attributes?.payload?.data?.id;
    const eventType = payload.data?.attributes?.name ?? "unknown";
    const status = normalizePersonaStatus(payload.data?.attributes?.payload?.data?.attributes?.status ?? eventType.replace(/^inquiry\./, ""));
    if (!eventId || !inquiryId) return NextResponse.json({ error: "Persona event is missing its event or inquiry ID" }, { status: 400 });

    const events = createSupabaseProviderEventRepository();
    const inserted = await events.insertIfNew({ provider: "PERSONA", providerEventId: eventId, eventType, payload });
    if (inserted.inserted && status) await createSupabaseOnboardingRepository().updateInquiryStatus(inquiryId, status);
    return NextResponse.json({ received: true, duplicate: !inserted.inserted });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to process Persona webhook" }, { status: 500 });
  }
}
