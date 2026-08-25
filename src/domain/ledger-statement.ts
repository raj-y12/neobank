export type StatementPosting = {
  accountCode: string;
  debitCents: number;
  creditCents: number;
};

export type StatementJournalEntry = {
  id: string;
  entryType: string;
  valueDate: string;
  bookingTimestamp: string;
  referenceId: string | null;
  reversalOfReferenceId: string | null;
  postings: StatementPosting[];
};

export type LedgerStatementRow = {
  journalEntryId: string;
  entryType: string;
  valueDate: string;
  bookingTimestamp: string;
  referenceId: string | null;
  reversalOfReferenceId: string | null;
  amountCents: number;
};

export function projectStatement(entries: StatementJournalEntry[]): LedgerStatementRow[] {
  return [...entries]
    .sort((a, b) => a.valueDate.localeCompare(b.valueDate) || a.bookingTimestamp.localeCompare(b.bookingTimestamp) || a.id.localeCompare(b.id))
    .map((entry) => ({
      journalEntryId: entry.id,
      entryType: entry.entryType,
      valueDate: entry.valueDate,
      bookingTimestamp: entry.bookingTimestamp,
      referenceId: entry.referenceId,
      reversalOfReferenceId: entry.reversalOfReferenceId,
      amountCents: entry.postings
        .filter((posting) => posting.accountCode === "CUSTOMER_AVAILABLE")
        .reduce((amount, posting) => amount + posting.creditCents - posting.debitCents, 0),
    }));
}
