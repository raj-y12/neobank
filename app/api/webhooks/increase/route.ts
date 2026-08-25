import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyIncreaseWebhook } from "@/src/integrations/increase/webhook-verification";
import { POST as processPaymentRailEvent } from "@/app/api/webhooks/payment-rail/route";

type IncreaseEvent = {
  id?: string;
  category?: string;
  type?: string;
  data?: { object?: Record<string, unknown> } | Record<string, unknown>;
  object?: Record<string, unknown>;
};

export async function POST(request: Request) {
  try {
    const body = await request.text();
    verifyIncreaseWebhook(body, {
      id: request.headers.get("webhook-id"),
      timestamp: request.headers.get("webhook-timestamp"),
      signature: request.headers.get("webhook-signature"),
    });
    const event = JSON.parse(body) as IncreaseEvent;
    const data = event.data as { object?: Record<string, unknown> } | Record<string, unknown> | undefined;
    const resource = ((data && "object" in data ? data.object : data) ?? event.object ?? {}) as Record<string, unknown>;
    const providerTransferId = typeof resource.id === "string" ? resource.id : null;
    if (!providerTransferId) return NextResponse.json({ accepted: true, ignored: true });
    const status = typeof resource.status === "string" ? resource.status : "";
    const settlement = resource.settlement as { settled_at?: string | null } | null | undefined;
    const eventType = event.category ?? event.type ?? "";
    const normalizedStatus = status === "returned" || status === "rejected" || status === "canceled"
      ? "RETURNED"
      : settlement?.settled_at || status === "settled" || eventType.endsWith(".settled")
        ? "SETTLED"
        : null;
    if (!normalizedStatus) return NextResponse.json({ accepted: true, ignored: true, providerTransferId });
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Supabase payment storage is not configured");
    const client = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: funding, error } = await client.from("funding_transfers").select("id").eq("provider_transfer_id", providerTransferId).maybeSingle<{ id: string }>();
    if (error) throw error;
    if (!funding) return NextResponse.json({ accepted: true, ignored: true, providerTransferId });
    return processPaymentRailEvent(new Request(request.url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ providerEventId: event.id ?? request.headers.get("webhook-id"), fundingTransferId: funding.id, status: normalizedStatus }) }));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to process Increase webhook" }, { status: 400 });
  }
}
