import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { projectLithicTransaction } from "../domain/lithic-transaction-projection";
import { reverseCardSettlement } from "../domain/ledger";
import { settlementReversalIdempotencyKey } from "../domain/card-return";
import { SupabaseCardReversalRepository } from "./supabase-card-reversal-repository";
import { SupabaseCardTransactionRepository } from "./supabase-card-transaction-repository";
import { SupabaseLedgerRepository } from "./supabase-ledger-repository";

const integrationEnabled = process.env.RUN_SUPABASE_INTEGRATION === "1"
  && Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

describe.skipIf(!integrationEnabled)("P0 unmatched return integration", () => {
  it("credits once, then links the return without a second credit", async () => {
    const client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const ledger = new SupabaseLedgerRepository(client);
    const transactions = new SupabaseCardTransactionRepository(client);
    const reversals = new SupabaseCardReversalRepository(client);
    const originalTransactionId = randomUUID();
    const providerReturnTransactionId = `p0-return-${randomUUID()}`;
    const providerEventId = `p0-event-${randomUUID()}`;
    const cardToken = `p0-card-${randomUUID()}`;
    const businessId = `p0-business-${randomUUID()}`;
    const accountId = `p0-account-${randomUUID()}`;
    const idempotencyKey = settlementReversalIdempotencyKey(providerEventId);
    const payload = {
      token: providerReturnTransactionId,
      card_token: cardToken,
      status: "SETTLED",
      settled_amount: 7_340,
      events: [{ type: "RETURN", created: "2026-08-25T10:00:00.000Z", amounts: { settlement: { amount: 7_340 } } }],
    };
    const entry = {
      ...reverseCardSettlement(7_340, providerReturnTransactionId, undefined, "2026-08-25"),
      businessId,
      accountId,
    };
    let journalEntryId: string | undefined;
    let returnTransactionId: string | undefined;

    try {
      const { error: originalError } = await client.from("card_transactions").insert({
        id: originalTransactionId,
        provider: "lithic",
        provider_transaction_id: `p0-original-${randomUUID()}`,
        card_token: cardToken,
        status: "SETTLED",
        authorization_amount_cents: 5_000,
        settled_amount_cents: 7_340,
      });
      if (originalError) throw originalError;

      await transactions.project(projectLithicTransaction({ providerEventId, payload }), payload);
      const { data: returnRow, error: returnRowError } = await client
        .from("card_transactions")
        .select("id")
        .eq("provider_transaction_id", providerReturnTransactionId)
        .single<{ id: string }>();
      if (returnRowError) throw returnRowError;
      returnTransactionId = returnRow.id;

      await ledger.record(entry, idempotencyKey);
      await ledger.record(entry, idempotencyKey);

      const intent = await reversals.createIntent({
        originalTransactionId,
        idempotencyKey: `p0-intent-${randomUUID()}`,
      });
      const linkedIntent = await reversals.linkReturn({
        intentId: intent.id,
        providerReturnTransactionId,
        returnCardToken: cardToken,
        returnAmountCents: 7_340,
      });
      expect(linkedIntent.status).toBe("LINKED");

      await transactions.project(projectLithicTransaction({
        providerEventId,
        reversalOfTransactionId: originalTransactionId,
        payload,
      }), payload);
      await ledger.record({ ...entry, reversalOfReferenceId: originalTransactionId }, idempotencyKey);

      const { data: journalRows, error: journalError } = await client
        .from("journal_entries")
        .select("id,reversal_of_reference_id")
        .eq("idempotency_key", idempotencyKey)
        .eq("business_id", businessId)
        .eq("account_id", accountId);
      if (journalError) throw journalError;
      expect(journalRows).toHaveLength(1);
      journalEntryId = journalRows[0].id;

      const { data: postings, error: postingsError } = await client
        .from("journal_postings")
        .select("account_code,credit_cents")
        .eq("journal_entry_id", journalEntryId);
      if (postingsError) throw postingsError;
      expect(postings?.filter((posting) => posting.account_code === "CUSTOMER_AVAILABLE" && posting.credit_cents === 7_340)).toHaveLength(1);

      const { data: linkedTransaction, error: linkedTransactionError } = await client
        .from("card_transactions")
        .select("status,reversal_of_transaction_id")
        .eq("id", returnTransactionId)
        .single<{ status: string; reversal_of_transaction_id: string | null }>();
      if (linkedTransactionError) throw linkedTransactionError;
      expect(linkedTransaction).toEqual({ status: "SETTLED", reversal_of_transaction_id: originalTransactionId });
    } finally {
      if (journalEntryId) {
        await client.from("journal_postings").delete().eq("journal_entry_id", journalEntryId);
        await client.from("journal_entries").delete().eq("id", journalEntryId);
      }
      await client.from("card_reversal_intents").delete().eq("original_transaction_id", originalTransactionId);
      if (returnTransactionId) await client.from("card_transaction_events").delete().eq("transaction_id", returnTransactionId);
      await client.from("card_transaction_events").delete().eq("transaction_id", originalTransactionId);
      if (returnTransactionId) await client.from("card_transactions").delete().eq("id", returnTransactionId);
      await client.from("card_transactions").delete().eq("id", originalTransactionId);
    }
  });
});
