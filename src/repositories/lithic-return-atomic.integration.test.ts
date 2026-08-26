import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { clearCardSettlement } from "../domain/ledger";
import { SupabaseLedgerRepository } from "./supabase-ledger-repository";
import { SupabaseProviderEventRepository } from "./supabase-provider-event-repository";
import { SupabaseCardReversalRepository } from "./supabase-card-reversal-repository";

const enabled = process.env.RUN_SUPABASE_INTEGRATION === "1" && Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

describe.skipIf(!enabled)("atomic card return allocation", () => {
  it("serializes distinct concurrent returns and keeps semantic retries idempotent", async () => {
    const client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
    const ledger = new SupabaseLedgerRepository(client);
    const original = `integration-original-${randomUUID()}`;
    const clearingRef = `${original}:clear-1`;
    await ledger.record({ ...clearCardSettlement(0, 5_000, clearingRef, "2026-08-26"), referenceId: clearingRef }, `integration:${clearingRef}`, "2026-08-26T10:00:00Z");
    const returns = ["return-a", "return-b"].map((returnEventId) => ledger.postCardReturnAtomically({
      originalProviderTransactionId: original,
      returnEventId,
      returnTransactionId: `tx-${returnEventId}`,
      amountCents: 4_000,
      learnedAt: "2026-08-29T10:00:00Z",
    }));
    const results = await Promise.allSettled(returns);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    const winner = results[0].status === "fulfilled" ? "return-a" : "return-b";
    await expect(ledger.postCardReturnAtomically({ originalProviderTransactionId: original, returnEventId: winner, returnTransactionId: `tx-${winner}`, amountCents: 4_000, learnedAt: "2026-08-29T10:00:00Z" })).resolves.toBeGreaterThan(0);
  });

  it("recovers park to link to allocation and semantic journal retry", async () => {
    const client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
    const ledger = new SupabaseLedgerRepository(client);
    const providers = new SupabaseProviderEventRepository(client);
    const reversals = new SupabaseCardReversalRepository(client);
    const originalProvider = `integration-original-${randomUUID()}`;
    const returnProvider = `integration-return-${randomUUID()}`;
    const clearingRef = `${originalProvider}:clear-1`;
    const card = `integration-card-${randomUUID()}`;
    await providers.insertIfNew({ provider: "lithic", providerEventId: `delivery-${randomUUID()}`, eventType: "card_transaction.updated", payload: { token: returnProvider, card_token: card, status: "SETTLED", events: [] } });
    expect((await providers.listForTransaction("lithic", returnProvider))[0].processingVersion).toBe(2);
    const { data: original, error: originalError } = await client.from("card_transactions").insert({ provider: "lithic", provider_transaction_id: originalProvider, card_token: card, status: "SETTLED", settled_amount_cents: 5_000 }).select("id").single<{ id: string }>();
    if (originalError) throw originalError;
    await ledger.record({ ...clearCardSettlement(0, 5_000, clearingRef, "2026-08-26"), referenceId: clearingRef }, `integration:${clearingRef}`, "2026-08-26T10:00:00Z");
    await providers.park({ provider: "lithic", providerEventId: `return-event-${randomUUID()}`, providerTransactionId: returnProvider, eventType: "RETURN", payload: { token: returnProvider } });
    const intent = await reversals.createIntent({ originalTransactionId: original.id, idempotencyKey: `integration-intent-${randomUUID()}` });
    const posted = await ledger.postCardReturnAtomically({ originalProviderTransactionId: originalProvider, returnEventId: "semantic-return-1", returnTransactionId: returnProvider, amountCents: 5_000, learnedAt: "2026-08-29T10:00:00Z" });
    expect(posted).toBe(1);
    const completed = await reversals.completeReturnLink({ intentId: intent.id, providerReturnTransactionId: returnProvider });
    expect(completed.status).toBe("POSTED");
    await expect(ledger.postCardReturnAtomically({ originalProviderTransactionId: originalProvider, returnEventId: "semantic-return-1", returnTransactionId: returnProvider, amountCents: 5_000, learnedAt: "2026-08-29T10:00:00Z" })).resolves.toBe(1);
  });
});
