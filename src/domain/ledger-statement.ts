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
  availableBalanceImpactCents: number;
};

function accountNet(postings: StatementPosting[], accountCode: string) {
  return postings
    .filter((posting) => posting.accountCode === accountCode)
    .reduce((amount, posting) => amount + posting.creditCents - posting.debitCents, 0);
}

export function projectStatement(entries: StatementJournalEntry[], options?: { asOfBookingTimestamp?: string }): LedgerStatementRow[] {
  return [...entries]
    .filter((entry) => !options?.asOfBookingTimestamp || entry.bookingTimestamp <= options.asOfBookingTimestamp)
    .sort((a, b) => a.valueDate.localeCompare(b.valueDate) || a.bookingTimestamp.localeCompare(b.bookingTimestamp) || a.id.localeCompare(b.id))
    .map((entry) => ({
      journalEntryId: entry.id,
      entryType: entry.entryType,
      valueDate: entry.valueDate,
      bookingTimestamp: entry.bookingTimestamp,
      referenceId: entry.referenceId,
      reversalOfReferenceId: entry.reversalOfReferenceId,
      // Clearing releases the old hold and posts the final merchant amount
      // in one journal entry. Use the payable leg for the transaction amount,
      // while retaining the customer-available leg as the balance movement.
      amountCents: entry.entryType === "CARD_CLEARING"
        ? -accountNet(entry.postings, "CARD_SETTLEMENT_PAYABLE")
        : accountNet(entry.postings, "CUSTOMER_AVAILABLE"),
      availableBalanceImpactCents: accountNet(entry.postings, "CUSTOMER_AVAILABLE"),
    }));
}
