import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { IncreaseAchRail } from "@/src/integrations/increase/client";
import { normalizeAchTransferEvent, type IncreaseEvent } from "@/src/integrations/increase/event";
import { verifyIncreaseWebhook } from "@/src/integrations/increase/webhook-verification";
import { processPaymentRailEvent } from "@/app/api/webhooks/payment-rail/route";

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
    const { data: funding, error: fundingError } = await client.from("funding_transfers").select("id").eq("provider_transfer_id", normalized.providerTransferId).maybeSingle<{ id: string }>();
    if (fundingError) throw fundingError;
    const { data: payment, error: paymentError } = await client.from("payments").select("id").eq("provider_payment_id", normalized.providerTransferId).maybeSingle<{ id: string }>();
    if (paymentError) throw paymentError;
    if (!funding && !payment) return NextResponse.json({ accepted: true, ignored: true, providerTransferId: normalized.providerTransferId });
    const result = await processPaymentRailEvent({
      providerEventId: normalized.providerEventId,
      fundingTransferId: funding?.id,
      paymentId: payment?.id,
      status: normalized.status,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to process Increase webhook" }, { status: 400 });
  }
}
