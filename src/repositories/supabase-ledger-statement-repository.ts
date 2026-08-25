import { createClient } from "@supabase/supabase-js";
import { projectStatement, type LedgerStatementRow, type StatementJournalEntry } from "../domain/ledger-statement";
import type { LedgerScope } from "../domain/ledger-balance";

type JournalRow = {
  id: string;
  entry_type: string;
  value_date: string;
  created_at: string;
  booking_date: string;
  reference_id: string | null;
  reversal_of_reference_id: string | null;
  journal_postings: Array<{ account_code: string; debit_cents: number; credit_cents: number }>;
};

type CardTransactionReference = {
  id: string;
  provider_transaction_id: string;
  reversal_of_transaction_id: string | null;
};

export function collectStatementReferenceIds(transaction: CardTransactionReference, relatedTransactions: CardTransactionReference[]) {
  return [...new Set([
    transaction.id,
    transaction.provider_transaction_id,
    ...(transaction.reversal_of_transaction_id ? [transaction.reversal_of_transaction_id] : []),
    ...relatedTransactions.flatMap((related) => [related.id, related.provider_transaction_id]),
  ])];
}

export function resolveReversalReferenceId(journalReversalOfReferenceId: string | null, referenceId: string | null, transactionRelationships: Map<string, string>) {
  return journalReversalOfReferenceId ?? (referenceId ? transactionRelationships.get(referenceId) ?? null : null);
}

export async function getLedgerStatement(transactionId?: string, asOfBookingTimestamp?: string, scope?: LedgerScope): Promise<LedgerStatementRow[]> {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error("Supabase ledger storage is not configured");

  const client = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

  let referenceIds: string[] | undefined;
  let transactionRelationships = new Map<string, string>();
  if (transactionId) {
    const { data: transaction, error: transactionError } = await client
      .from("card_transactions")
      .select("id,provider_transaction_id,reversal_of_transaction_id")
      .eq("id", transactionId)
      .single<CardTransactionReference>();
    if (transactionError) throw transactionError;

    const relatedQuery = client
      .from("card_transactions")
      .select("id,provider_transaction_id,reversal_of_transaction_id");
    const { data: relatedTransactions, error: relatedTransactionsError } = transaction.reversal_of_transaction_id
      ? await relatedQuery.or(`id.eq.${transaction.reversal_of_transaction_id},reversal_of_transaction_id.eq.${transaction.id}`)
      : await relatedQuery.eq("reversal_of_transaction_id", transaction.id);
    if (relatedTransactionsError) throw relatedTransactionsError;

    const related = relatedTransactions ?? [];
    referenceIds = collectStatementReferenceIds(transaction, related);
    transactionRelationships = new Map(
      [transaction, ...related]
        .filter((candidate): candidate is CardTransactionReference & { reversal_of_transaction_id: string } => Boolean(candidate.reversal_of_transaction_id))
        .map((candidate) => [candidate.provider_transaction_id, candidate.reversal_of_transaction_id]),
    );
  }

  let query = client
    .from("journal_entries")
    .select("id,entry_type,value_date,booking_date,created_at,reference_id,reversal_of_reference_id,journal_postings(account_code,debit_cents,credit_cents)");

  if (referenceIds) {
    const filters = referenceIds.flatMap((referenceId) => [
      `reference_id.eq.${referenceId}`,
      `reversal_of_reference_id.eq.${referenceId}`,
    ]).join(",");
    query = query.or(filters);
  }

  if (asOfBookingTimestamp) query = query.lte("created_at", asOfBookingTimestamp);
  if (scope) query = query.eq("business_id", scope.businessId).eq("account_id", scope.accountId);

  const { data, error } = await query;
  if (error) throw error;

  const entries: StatementJournalEntry[] = ((data ?? []) as JournalRow[]).map((row) => ({
    id: row.id,
    entryType: row.entry_type,
    valueDate: row.value_date,
    bookingTimestamp: row.created_at,
    bookingDate: row.booking_date,
    referenceId: row.reference_id,
    reversalOfReferenceId: resolveReversalReferenceId(row.reversal_of_reference_id, row.reference_id, transactionRelationships),
    postings: row.journal_postings.map((posting) => ({
      accountCode: posting.account_code,
      debitCents: posting.debit_cents,
      creditCents: posting.credit_cents,
    })),
  }));

  return projectStatement(entries, { asOfBookingTimestamp });
}

export async function getLedgerActivity(limit = 8, scope?: LedgerScope): Promise<LedgerStatementRow[]> {
  const rows = await getLedgerStatement(undefined, undefined, scope);

  return [...rows]
    .sort((a, b) =>
      b.valueDate.localeCompare(a.valueDate) ||
      b.bookingTimestamp.localeCompare(a.bookingTimestamp) ||
      b.journalEntryId.localeCompare(a.journalEntryId),
    )
    .slice(0, limit);
}
