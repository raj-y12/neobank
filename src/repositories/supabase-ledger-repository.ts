import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { JournalEntry } from "../domain/ledger";
import { deriveLedgerBalances, type BalancePosting, type LedgerScope } from "../domain/ledger-balance";
import type { LedgerRepository } from "./ledger-repository";

export class SupabaseLedgerRepository implements LedgerRepository {
  constructor(private readonly client: SupabaseClient) {}

  async record(entry: JournalEntry, idempotencyKey: string) {
    const { error } = await this.client.rpc("record_journal_entry", {
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
    if (error) throw error;
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
}

export function createSupabaseLedgerRepository() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error("Supabase ledger storage is not configured");
  return new SupabaseLedgerRepository(createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } }));
}
