import { NextResponse } from "next/server";
import { verifyLithicWebhook } from "@/src/integrations/lithic/webhook-verification";
import { projectLithicTransaction } from "@/src/domain/lithic-transaction-projection";
import { createSupabaseCardTransactionRepository } from "@/src/repositories/supabase-card-transaction-repository";
import { createSupabaseProviderEventRepository } from "@/src/repositories/supabase-provider-event-repository";

export async function POST(request: Request) {
  const secret = process.env.LITHIC_WEBHOOK_SECRET;

  if (!secret) {
    return NextResponse.json(
      { error: "Lithic webhook storage is not configured" },
      { status: 503 },
    );
  }

  const body = await request.text();
  const headers = {
    "webhook-id": request.headers.get("webhook-id") ?? undefined,
    "webhook-timestamp": request.headers.get("webhook-timestamp") ?? undefined,
    "webhook-signature": request.headers.get("webhook-signature") ?? undefined,
  };

  let event: unknown;
  try {
    event = verifyLithicWebhook({ body, headers, secret });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid webhook";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const webhookId = headers["webhook-id"];
  if (!webhookId) {
    return NextResponse.json({ error: "Missing webhook ID" }, { status: 400 });
  }

  try {
    const repository = createSupabaseProviderEventRepository();
    const stored = await repository.insertIfNew({
      provider: "lithic",
      providerEventId: webhookId,
      eventType: getEventType(event),
      payload: event,
    });

    if (getEventType(event) === "card_transaction.updated") {
      const transactionRepository = createSupabaseCardTransactionRepository();
      await transactionRepository.project(
        projectLithicTransaction({
          providerEventId: webhookId,
          payload: assertLithicTransactionPayload(event),
        }),
        event,
      );
    }

    return NextResponse.json({ accepted: true, duplicate: !stored.inserted });
  } catch (error) {
    console.error("Lithic webhook persistence failed", error);
    return NextResponse.json({ error: "Webhook storage unavailable" }, { status: 503 });
  }
}

function assertLithicTransactionPayload(event: unknown) {
  if (typeof event !== "object" || event === null) throw new Error("Invalid Lithic transaction payload");
  const payload = event as Record<string, unknown>;
  if (typeof payload.token !== "string" || typeof payload.card_token !== "string" || typeof payload.status !== "string") {
    throw new Error("Lithic transaction payload is missing identity fields");
  }
  return payload as Parameters<typeof projectLithicTransaction>[0]["payload"];
}

function getEventType(event: unknown) {
  if (typeof event !== "object" || event === null) return "unknown";

  const eventRecord = event as Record<string, unknown>;
  return typeof eventRecord.event_type === "string"
    ? eventRecord.event_type
    : typeof eventRecord.type === "string"
      ? eventRecord.type
      : "unknown";
}
