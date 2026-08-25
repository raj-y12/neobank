import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { IncreaseAchRail } from "@/src/integrations/increase/client";
import { normalizeAchTransferEvent, type IncreaseEvent } from "@/src/integrations/increase/event";
import { verifyIncreaseWebhook } from "@/src/integrations/increase/webhook-verification";
import { POST as processPaymentRailEvent } from "@/app/api/webhooks/payment-rail/route";

export async function POST(request: Request) {
  try {
    const body = await request.text();
    verifyIncreaseWebhook(body, {
      id: request.headers.get("webhook-id"),
      timestamp: request.headers.get("webhook-timestamp"),
      signature: request.headers.get("webhook-signature"),
    });
    const event = JSON.parse(body) as IncreaseEvent;
    if (event.associated_object_type !== "ach_transfer" || !event.associated_object_id) return NextResponse.json({ accepted: true, ignored: true });
    const transfer = await new IncreaseAchRail().retrieveTransfer(event.associated_object_id);
    const normalized = normalizeAchTransferEvent(event, transfer);
    if (!normalized?.providerEventId) return NextResponse.json({ accepted: true, ignored: true, providerTransferId: event.associated_object_id });
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Supabase payment storage is not configured");
    const client = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: funding, error } = await client.from("funding_transfers").select("id").eq("provider_transfer_id", normalized.providerTransferId).maybeSingle<{ id: string }>();
    if (error) throw error;
    if (!funding) return NextResponse.json({ accepted: true, ignored: true, providerTransferId: normalized.providerTransferId });
    return processPaymentRailEvent(new Request(request.url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ providerEventId: normalized.providerEventId, fundingTransferId: funding.id, status: normalized.status }) }));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to process Increase webhook" }, { status: 400 });
  }
}
