import { NextResponse } from "next/server";
import type { LithicTransactionPayload } from "@/src/domain/lithic-lifecycle";
import { createSupabaseCardTransactionRepository } from "@/src/repositories/supabase-card-transaction-repository";
import { createSupabaseLedgerRepository } from "@/src/repositories/supabase-ledger-repository";
import { createSupabaseProviderEventRepository } from "@/src/repositories/supabase-provider-event-repository";
import { processLithicLifecycle } from "@/src/services/lithic-lifecycle-service";
import { recoverAgedLithicEvents } from "@/src/services/lithic-recovery-service";
import { hasCronAuthorization } from "@/src/services/cron-auth";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!hasCronAuthorization(request, secret)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const providers = createSupabaseProviderEventRepository();
  const transactions = createSupabaseCardTransactionRepository();
  const ledger = createSupabaseLedgerRepository();
  const now = new Date();
  const before = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
  const recovered = await recoverAgedLithicEvents({
    listAged: () => providers.listAgedParked("lithic", before),
    replay: async (transactionId) => {
      const stored = await providers.listForTransaction("lithic", transactionId);
      const excluded = new Set(stored.filter((row) => row.processingVersion < 2).flatMap((row) => (row.payload as LithicTransactionPayload).events?.flatMap((event) => event.token ? [event.token] : []) ?? []));
      const snapshots = stored.filter((row) => row.processingVersion >= 2).map((row) => ({ webhookId: row.providerEventId, receivedAt: row.receivedAt, payload: row.payload as LithicTransactionPayload }));
      const baseline = await transactions.getLifecycleBaseline(transactionId);
      await processLithicLifecycle(snapshots, { now: now.toISOString(), initialState: baseline, excludedSemanticEventIds: excluded }, {
        project: (event) => transactions.projectLifecycle(event),
        park: (event) => providers.park({ provider: "lithic", providerEventId: event.semanticEventId, providerTransactionId: event.transactionId, eventType: event.type, payload: event }),
        markMatched: (event) => providers.markMatched("lithic", event.semanticEventId),
        record: (command) => ledger.record(command.entry, command.idempotencyKey, command.learnedAt),
      });
    },
  });
  return NextResponse.json({ recovered });
}
