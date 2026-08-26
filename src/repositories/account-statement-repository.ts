import type { AccountStatement, StatementJournalEntry } from "../domain/account-statement";
import type { LedgerScope } from "../domain/ledger-balance";

export type StatementQuery = { statementDate: string; statementEndDate?: string; asOfBookingTimestamp?: string };

export interface AccountStatementRepository {
  getAccountStatement(scope: LedgerScope, query: StatementQuery): Promise<AccountStatement>;
  getLatestStatementDate(scope: LedgerScope): Promise<string | null>;
  getEarliestStatementDate(scope: LedgerScope): Promise<string | null>;
}

export type PersistedJournalRow = {
  id: string;
  entry_type: string;
  value_date: string;
  created_at: string;
  booking_date: string;
  reference_id: string | null;
  reversal_of_reference_id: string | null;
  journal_postings: Array<{ account_code: string; debit_cents: number; credit_cents: number }>;
};

export function mapPersistedJournalRow(row: PersistedJournalRow): StatementJournalEntry {
  return {
    id: row.id,
    entryType: row.entry_type,
    valueDate: row.value_date,
    bookingTimestamp: row.created_at,
    bookingDate: row.booking_date,
    referenceId: row.reference_id,
    reversalOfReferenceId: row.reversal_of_reference_id,
    postings: row.journal_postings.map((posting) => ({
      accountCode: posting.account_code,
      debitCents: posting.debit_cents,
      creditCents: posting.credit_cents,
    })),
  };
}
