import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { JournalEntry } from "../domain/ledger";
import { deriveLedgerBalances, type BalancePosting, type LedgerScope } from "../domain/ledger-balance";
import type { LedgerRepository } from "./ledger-repository";

export class SupabaseLedgerRepository implements LedgerRepository {
  constructor(private readonly client: SupabaseClient) {}

  async record(entry: JournalEntry, idempotencyKey: string, knowledgeTime?: string) {
    const { data, error } = knowledgeTime ? await this.client.rpc("record_journal_entry_at", {
      p_entry_type: entry.entryType,
      p_value_date: entry.valueDate,
      p_reference_id: entry.referenceId ?? null,
      p_reversal_of_reference_id: entry.reversalOfReferenceId ?? null,
      p_idempotency_key: idempotencyKey,
      p_business_id: entry.businessId ?? process.env.LEDGER_BUSINESS_ID ?? "demo-business",
      p_account_id: entry.accountId ?? process.env.LEDGER_ACCOUNT_ID ?? "demo-account",
      p_postings: entry.postings.map((posting) => ({ accountCode: posting.accountCode, debitCents: posting.debitCents, creditCents: posting.creditCents })),
      p_knowledge_time: knowledgeTime,
    }) : await this.client.rpc("record_journal_entry", {
      p_entry_type: entry.entryType,
      p_value_date: entry.valueDate,
      p_reference_id: entry.referenceId ?? null,
      p_reversal_of_reference_id: entry.reversalOfReferenceId ?? null,
      p_idempotency_key: idempotencyKey,
      p_business_id: entry.businessId ?? process.env.LEDGER_BUSINESS_ID ?? "demo-business",
      p_account_id: entry.accountId ?? process.env.LEDGER_ACCOUNT_ID ?? "demo-account",
      p_postings: entry.postings.map((posting) => ({
        accountCode: posting.accountCode,
        debitCents: posting.debitCents,
        creditCents: posting.creditCents,
      })),
    });
    void data;
    if (error) throw error;
  }

  async postCardReturnAtomically(input: { originalProviderTransactionId: string; returnEventId: string; returnTransactionId: string; amountCents: number; learnedAt: string }) {
    const { data, error } = await this.client.rpc("post_card_return_atomic", {
      p_original_provider_transaction_id: input.originalProviderTransactionId,
      p_return_event_id: input.returnEventId,
      p_return_transaction_id: input.returnTransactionId,
      p_amount_cents: input.amountCents,
      p_knowledge_time: input.learnedAt,
      p_business_id: process.env.LEDGER_BUSINESS_ID ?? "demo-business",
      p_account_id: process.env.LEDGER_ACCOUNT_ID ?? "demo-account",
    });
    if (error) throw error;
    return data as number;
  }

  async getBalances(scope?: LedgerScope) {
    let entriesQuery = this.client.from("journal_entries").select("id,business_id,account_id");
    if (scope) entriesQuery = entriesQuery.eq("business_id", scope.businessId).eq("account_id", scope.accountId);
    const { data: entries, error: entriesError } = await entriesQuery;
    if (entriesError) throw entriesError;
    const entryRows = (entries ?? []) as Array<{ id: string; business_id: string; account_id: string }>;
    if (entryRows.length === 0) return deriveLedgerBalances([], scope);

    const { data, error } = await this.client
      .from("journal_postings")
      .select("account_code,debit_cents,credit_cents,journal_entry_id")
      .in("journal_entry_id", entryRows.map((entryRow) => entryRow.id));
    if (error) throw error;
    const entryScope = new Map(entryRows.map((entryRow) => [entryRow.id, { businessId: entryRow.business_id, accountId: entryRow.account_id }]));
    const postings: BalancePosting[] = ((data ?? []) as Array<{ journal_entry_id: string; account_code: string; debit_cents: number; credit_cents: number }>).map((posting) => ({
      ...entryScope.get(posting.journal_entry_id),
      accountCode: posting.account_code,
      debitCents: posting.debit_cents,
      creditCents: posting.credit_cents,
    }));
    return deriveLedgerBalances(postings, scope);
  }

  async getReversibleCardClearings(providerTransactionId: string, replayIdempotencyPrefix?: string) {
    const { data: clearings, error: clearingError } = await this.client.from("journal_entries")
      .select("id,value_date,reference_id")
      .eq("entry_type", "CARD_CLEARING")
      .like("reference_id", `${providerTransactionId}:%`)
      .order("value_date", { ascending: true })
      .order("created_at", { ascending: true });
    if (clearingError) throw clearingError;
    const clearingRows = (clearings ?? []) as Array<{ id: string; value_date: string; reference_id: string }>;
    if (clearingRows.length === 0) return [];
    const references = clearingRows.map((row) => row.reference_id);
    const { data: reversals, error: reversalError } = await this.client.from("journal_entries")
      .select("id,reversal_of_reference_id,idempotency_key")
      .eq("entry_type", "CARD_SETTLEMENT_REVERSAL")
      .in("reversal_of_reference_id", references);
    if (reversalError) throw reversalError;
    const reversalRows = (reversals ?? []) as Array<{ id: string; reversal_of_reference_id: string; idempotency_key: string | null }>;
    const allEntryIds = [...clearingRows.map((row) => row.id), ...reversalRows.map((row) => row.id)];
    const { data: postings, error: postingError } = await this.client.from("journal_postings")
      .select("journal_entry_id,account_code,debit_cents,credit_cents")
      .in("journal_entry_id", allEntryIds)
      .eq("account_code", "CARD_SETTLEMENT_PAYABLE");
    if (postingError) throw postingError;
    const payableByEntry = new Map(((postings ?? []) as Array<{ journal_entry_id: string; debit_cents: number; credit_cents: number }>).map((row) => [row.journal_entry_id, row.credit_cents - row.debit_cents]));
    const reversedByReference = new Map<string, number>();
    for (const reversal of reversalRows) {
      if (replayIdempotencyPrefix && reversal.idempotency_key?.startsWith(replayIdempotencyPrefix)) continue;
      reversedByReference.set(reversal.reversal_of_reference_id, (reversedByReference.get(reversal.reversal_of_reference_id) ?? 0) + Math.abs(payableByEntry.get(reversal.id) ?? 0));
    }
    return clearingRows.map((clearing) => ({
      clearingReferenceId: clearing.reference_id,
      valueDate: clearing.value_date,
      reversibleCents: Math.max(0, (payableByEntry.get(clearing.id) ?? 0) - (reversedByReference.get(clearing.reference_id) ?? 0)),
    })).filter((clearing) => clearing.reversibleCents > 0);
  }
}

export function createSupabaseLedgerRepository() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error("Supabase ledger storage is not configured");
  return new SupabaseLedgerRepository(createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } }));
}
