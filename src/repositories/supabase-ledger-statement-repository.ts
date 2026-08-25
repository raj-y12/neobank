import { createClient } from "@supabase/supabase-js";
import { projectStatement, type LedgerStatementRow, type StatementJournalEntry } from "@/src/domain/ledger-statement";

type JournalRow = {
  id: string;
  entry_type: string;
  value_date: string;
  created_at: string;
  reference_id: string | null;
  reversal_of_reference_id: string | null;
  journal_postings: Array<{ account_code: string; debit_cents: number; credit_cents: number }>;
};

export async function getLedgerStatement(): Promise<LedgerStatementRow[]> {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error("Supabase ledger storage is not configured");

  const client = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data, error } = await client
    .from("journal_entries")
    .select("id,entry_type,value_date,created_at,reference_id,reversal_of_reference_id,journal_postings(account_code,debit_cents,credit_cents)");
  if (error) throw error;

  const entries: StatementJournalEntry[] = ((data ?? []) as JournalRow[]).map((row) => ({
    id: row.id,
    entryType: row.entry_type,
    valueDate: row.value_date,
    bookingTimestamp: row.created_at,
    referenceId: row.reference_id,
    reversalOfReferenceId: row.reversal_of_reference_id,
    postings: row.journal_postings.map((posting) => ({
      accountCode: posting.account_code,
      debitCents: posting.debit_cents,
      creditCents: posting.credit_cents,
    })),
  }));

  return projectStatement(entries);
}
