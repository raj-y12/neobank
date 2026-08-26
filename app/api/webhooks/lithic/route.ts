import { NextResponse } from "next/server";
import { verifyLithicWebhook } from "@/src/integrations/lithic/webhook-verification";
import type { LithicTransactionPayload } from "@/src/domain/lithic-lifecycle";
import { processLithicLifecycle } from "@/src/services/lithic-lifecycle-service";
import { createSupabaseCardTransactionRepository } from "@/src/repositories/supabase-card-transaction-repository";
import { createSupabaseLedgerRepository } from "@/src/repositories/supabase-ledger-repository";
import { createSupabaseProviderEventRepository } from "@/src/repositories/supabase-provider-event-repository";
import { createSupabaseCardReversalRepository } from "@/src/repositories/supabase-card-reversal-repository";

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
      const ledgerRepository = createSupabaseLedgerRepository();
      const legacySemanticEventIds = new Set(providerEvents.filter((providerEvent) => providerEvent.processingVersion < 2).flatMap((providerEvent) =>
        assertLithicTransactionPayload(providerEvent.payload).events?.flatMap((nestedEvent) => nestedEvent.token ? [nestedEvent.token] : []) ?? [],
      ));
      const snapshots = providerEvents.filter((providerEvent) => providerEvent.processingVersion >= 2).map((providerEvent) => ({
        webhookId: providerEvent.providerEventId,
        receivedAt: providerEvent.receivedAt,
        payload: assertLithicTransactionPayload(providerEvent.payload),
      }));
      const baseline = await transactionRepository.getLifecycleBaseline(payload.token);
      const plan = await processLithicLifecycle(snapshots, { now: new Date().toISOString(), initialState: baseline, excludedSemanticEventIds: legacySemanticEventIds }, {
        project: (plannedEvent) => transactionRepository.projectLifecycle(plannedEvent),
        park: (plannedEvent) => repository.park({ provider: "lithic", providerEventId: plannedEvent.semanticEventId, providerTransactionId: plannedEvent.transactionId, eventType: plannedEvent.type, payload: plannedEvent }),
        markMatched: (plannedEvent) => repository.markMatched("lithic", plannedEvent.semanticEventId),
        record: (command) => ledgerRepository.record(command.entry, command.idempotencyKey, command.learnedAt),
      });
      for (const returned of plan.events.filter((plannedEvent) => plannedEvent.type === "RETURN" && plannedEvent.disposition === "READY" && plannedEvent.settlementDeltaCents > 0)) {
        if (!linkedIntent) {
          await repository.park({ provider: "lithic", providerEventId: returned.semanticEventId, providerTransactionId: returned.transactionId, eventType: returned.type, payload: returned });
          continue;
        }
        const originalProviderTransactionId = await transactionRepository.findProviderTransactionId(linkedIntent.originalTransactionId);
        if (!originalProviderTransactionId) throw new Error("Original Lithic transaction is missing");
        await transactionRepository.linkReversal(returned.transactionId, linkedIntent.originalTransactionId);
        const posted = await ledgerRepository.postCardReturnAtomically({ originalProviderTransactionId, returnEventId: returned.semanticEventId, returnTransactionId: returned.transactionId, amountCents: returned.settlementDeltaCents, learnedAt: returned.learnedAt });
        if (posted > 0) await reversalRepository.markPosted(linkedIntent.id);
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
  return payload as unknown as LithicTransactionPayload;
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
