import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { JournalEntry } from "@/src/domain/ledger";
import type { LedgerRepository } from "./ledger-repository";

export class SupabaseLedgerRepository implements LedgerRepository {
  constructor(private readonly client: SupabaseClient) {}

  async record(entry: JournalEntry, idempotencyKey: string) {
    const { data, error } = await this.client
      .from("journal_entries")
      .insert({
        entry_type: entry.entryType,
        value_date: entry.valueDate,
        reference_id: entry.referenceId ?? null,
        idempotency_key: idempotencyKey,
      })
      .select("id")
      .single<{ id: string }>();

    if (error?.code === "23505") return;
    if (error) throw error;

    const { error: postingError } = await this.client
      .from("journal_postings")
      .insert(entry.postings.map((posting) => ({
        journal_entry_id: data.id,
        account_code: posting.accountCode,
        debit_cents: posting.debitCents,
        credit_cents: posting.creditCents,
      })));

    if (postingError) throw postingError;
  }
}

export function createSupabaseLedgerRepository() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error("Supabase ledger storage is not configured");
  return new SupabaseLedgerRepository(createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } }));
}
