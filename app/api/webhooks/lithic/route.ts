import { NextResponse } from "next/server";
import { verifyLithicWebhook } from "@/src/integrations/lithic/webhook-verification";
import { projectLithicTransaction } from "@/src/domain/lithic-transaction-projection";
import { authorizeHold, clearCardSettlement, releaseAuthorizationHold, reverseCardSettlement } from "@/src/domain/ledger";
import { createSupabaseCardTransactionRepository } from "@/src/repositories/supabase-card-transaction-repository";
import { createSupabaseLedgerRepository } from "@/src/repositories/supabase-ledger-repository";
import { createSupabaseProviderEventRepository } from "@/src/repositories/supabase-provider-event-repository";
import { createSupabaseCardReversalRepository } from "@/src/repositories/supabase-card-reversal-repository";
import { reconcileCardEvents } from "@/src/domain/card-event-ordering";
import { settlementReversalIdempotencyKey } from "@/src/domain/card-return";

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
      const reversalRepository = createSupabaseCardReversalRepository();
      const payload = assertLithicTransactionPayload(event);
      const linkedIntent = await reversalRepository.findByProviderReturnTransactionId(payload.token);
      const providerEvents = await repository.listForTransaction("lithic", payload.token);
      const cardEvents = providerEvents.map((providerEvent) => ({
        providerEventId: providerEvent.providerEventId,
        transactionId: payload.token,
        eventType: latestEventType(providerEvent.payload),
        occurredAt: latestEventCreated(providerEvent.payload),
      }));
      const { ready } = reconcileCardEvents(cardEvents);
      const readyIds = new Set(ready.map((readyEvent) => readyEvent.providerEventId));
      for (const parkedEvent of cardEvents.filter((candidate) => !readyIds.has(candidate.providerEventId))) {
        const storedParkedEvent = providerEvents.find((candidate) => candidate.providerEventId === parkedEvent.providerEventId);
        if (storedParkedEvent) await repository.park({ ...storedParkedEvent, providerTransactionId: payload.token });
      }
      for (const readyEvent of ready) await repository.markMatched("lithic", readyEvent.providerEventId);
      const orderedEvents = [...providerEvents].sort((a, b) => new Date(latestEventCreated(a.payload) ?? 0).getTime() - new Date(latestEventCreated(b.payload) ?? 0).getTime());
      const ledgerRepository = createSupabaseLedgerRepository();
      for (const providerEvent of orderedEvents) {
        const eventIdentity = cardEvents.find((candidate) => candidate.providerEventId === providerEvent.providerEventId);
        if (!eventIdentity) continue;
        const eventPayload = payloadThrough(orderedEvents, providerEvent);
        const projection = projectLithicTransaction({
          providerEventId: providerEvent.providerEventId,
          reversalOfTransactionId: linkedIntent?.originalTransactionId,
          payload: eventPayload,
        });
        await transactionRepository.project(projection, providerEvent.payload);
        if (!readyIds.has(providerEvent.providerEventId)) continue;

        const valueDate = projection.event.occurredAt?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);
        if (projection.event.eventType === "AUTHORIZATION" && projection.hold) {
          await ledgerRepository.record(
            authorizeHold(projection.hold.amountCents, projection.transaction.providerTransactionId, valueDate),
            `lithic:${providerEvent.providerEventId}:authorization`,
          );
        }
        if (projection.event.eventType === "CLEARING" && projection.event.settlementAmountCents) {
          await ledgerRepository.record(
            clearCardSettlement(projection.hold?.amountCents ?? 0, projection.event.settlementAmountCents, projection.transaction.providerTransactionId, valueDate),
            `lithic:${providerEvent.providerEventId}:clearing`,
          );
        }
        if ((projection.event.eventType === "REVERSAL" || projection.event.eventType === "AUTHORIZATION_REVERSAL") && projection.hold) {
          await ledgerRepository.record(
            releaseAuthorizationHold(projection.hold.amountCents, projection.transaction.providerTransactionId, valueDate),
            `lithic:${providerEvent.providerEventId}:authorization-reversal`,
          );
        }
        if (projection.event.eventType === "RETURN" && projection.event.settlementAmountCents) {
          await ledgerRepository.record(
            reverseCardSettlement(
              projection.event.settlementAmountCents,
              projection.transaction.providerTransactionId,
              linkedIntent?.originalTransactionId,
              valueDate,
            ),
            settlementReversalIdempotencyKey(providerEvent.providerEventId),
          );
          if (linkedIntent) await reversalRepository.markPosted(linkedIntent.id);
        }
      }
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

function latestEventType(payload: unknown) {
  const record = assertLithicTransactionPayload(payload);
  return [...(record.events ?? [])].sort((a, b) => new Date(b.created ?? 0).getTime() - new Date(a.created ?? 0).getTime())[0]?.type ?? "UNKNOWN";
}

function latestEventCreated(payload: unknown) {
  const record = assertLithicTransactionPayload(payload);
  return [...(record.events ?? [])].sort((a, b) => new Date(b.created ?? 0).getTime() - new Date(a.created ?? 0).getTime())[0]?.created ?? null;
}

function payloadThrough(events: Array<{ payload: unknown }>, target: { payload: unknown }) {
  const targetPayload = assertLithicTransactionPayload(target.payload);
  const targetTime = new Date(latestEventCreated(target.payload) ?? 0).getTime();
  const eventMap = new Map<string, unknown>();
  for (const event of events) {
    const payload = assertLithicTransactionPayload(event.payload);
    for (const nestedEvent of payload.events ?? []) {
      if (new Date(nestedEvent.created ?? 0).getTime() <= targetTime) {
        eventMap.set(`${nestedEvent.type}:${nestedEvent.created}`, nestedEvent);
      }
    }
  }
  return { ...targetPayload, events: [...eventMap.values()] } as Parameters<typeof projectLithicTransaction>[0]["payload"];
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
