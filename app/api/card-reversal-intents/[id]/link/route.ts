import { NextResponse } from "next/server";
import type { LithicTransactionPayload } from "@/src/domain/lithic-lifecycle";
import { processLithicLifecycle } from "@/src/services/lithic-lifecycle-service";
import { createSupabaseCardReversalRepository } from "@/src/repositories/supabase-card-reversal-repository";
import { createSupabaseCardTransactionRepository } from "@/src/repositories/supabase-card-transaction-repository";
import { createSupabaseLedgerRepository } from "@/src/repositories/supabase-ledger-repository";
import { createSupabaseProviderEventRepository } from "@/src/repositories/supabase-provider-event-repository";
import { getAuthenticatedScope } from "@/src/lib/auth-scope";
import { getBusinessCardAssignment } from "@/src/repositories/supabase-business-card-repository";
import { canViewCard } from "@/src/domain/card-access";
import { validateReturnLink } from "@/src/domain/card-reversal";
import { isUuid } from "@/src/lib/identifiers";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const scope = await getAuthenticatedScope();
    if (!isUuid(id)) return NextResponse.json({ error: "Reversal intent not found" }, { status: 404 });
    const reversalRepository = createSupabaseCardReversalRepository();
    const existingIntent = await reversalRepository.getIntent(id);
    const assignment = await getBusinessCardAssignment(scope.businessId, existingIntent.cardToken);
    if (!assignment || !canViewCard({ role: scope.role, currentMemberId: scope.memberId, assignedMemberId: assignment.memberId })) return NextResponse.json({ error: "Card is outside the authenticated business scope" }, { status: 404 });
    const body = await request.json() as { providerReturnTransactionId?: string; returnCardToken?: string; returnAmountCents?: number };
    const returnAmountCents = body.returnAmountCents;
    if (!body.providerReturnTransactionId || !body.returnCardToken || typeof returnAmountCents !== "number" || !Number.isSafeInteger(returnAmountCents)) {
      return NextResponse.json({ error: "providerReturnTransactionId, returnCardToken, and returnAmountCents are required" }, { status: 400 });
    }
    validateReturnLink({ intent: existingIntent, returnCardToken: body.returnCardToken, returnAmountCents });
    const posted = await replayStoredReturn(existingIntent, body.providerReturnTransactionId);
    if (posted <= 0) throw new Error("No ready return event was posted");
    const intent = await reversalRepository.completeReturnLink({ intentId: id, providerReturnTransactionId: body.providerReturnTransactionId });
    return NextResponse.json({ intent });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to link return";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

async function replayStoredReturn(intent: { id: string; originalTransactionId: string; providerReturnTransactionId: string | null }, providerReturnTransactionId: string) {

  const transactions = createSupabaseCardTransactionRepository();
  const ledger = createSupabaseLedgerRepository();
  const providerEvents = createSupabaseProviderEventRepository();
  const stored = await providerEvents.listForTransaction("lithic", providerReturnTransactionId);
  if (stored.length === 0) return 0;
  const legacySemanticEventIds = new Set(stored.filter((row) => row.processingVersion < 2).flatMap((row) => (row.payload as LithicTransactionPayload).events?.flatMap((event) => event.token ? [event.token] : []) ?? []));
  const snapshots = stored.filter((row) => row.processingVersion >= 2).map((row) => ({ webhookId: row.providerEventId, receivedAt: row.receivedAt, payload: row.payload as LithicTransactionPayload }));
  const baseline = await transactions.getLifecycleBaseline(providerReturnTransactionId);
  const plan = await processLithicLifecycle(snapshots, { now: new Date().toISOString(), initialState: baseline, excludedSemanticEventIds: legacySemanticEventIds }, {
    project: (event) => transactions.projectLifecycle(event),
    park: (event) => providerEvents.park({ provider: "lithic", providerEventId: event.semanticEventId, providerTransactionId: event.transactionId, eventType: event.type, payload: event }),
    markMatched: (event) => providerEvents.markMatched("lithic", event.semanticEventId),
    record: (command) => ledger.record(command.entry, command.idempotencyKey, command.learnedAt),
  });
  const originalProviderTransactionId = await transactions.findProviderTransactionId(intent.originalTransactionId);
  if (!originalProviderTransactionId) throw new Error("Original Lithic transaction is missing");
  await transactions.linkReversal(providerReturnTransactionId, intent.originalTransactionId);
  let posted = 0;
  for (const returned of plan.events.filter((event) => event.type === "RETURN" && event.disposition === "READY" && event.settlementDeltaCents > 0)) {
    posted += await ledger.postCardReturnAtomically({ originalProviderTransactionId, returnEventId: returned.semanticEventId, returnTransactionId: returned.transactionId, amountCents: returned.settlementDeltaCents, learnedAt: returned.learnedAt });
  }
  return posted;
}
