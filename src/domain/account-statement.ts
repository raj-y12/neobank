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
  bookingDate?: string;
  referenceId: string | null;
  reversalOfReferenceId: string | null;
  postings: StatementPosting[];
};

export type StatementRowKind = "POSTED" | "HOLD" | "CORRECTION";

export type AccountStatementRow = {
  journalEntryId: string;
  kind: StatementRowKind;
  entryType: string;
  valueDate: string;
  bookingTimestamp: string;
  bookingDate?: string;
  referenceId: string | null;
  reversalOfReferenceId: string | null;
  postedAmountCents: number;
  availableBalanceImpactCents: number;
  holdImpactCents: number;
  runningAvailableBalanceCents: number;
};

export type AccountStatement = {
  statementDate: string;
  statementEndDate: string;
  asOfBookingTimestamp?: string;
  openingLedgerBalanceCents: number;
  openingAvailableBalanceCents: number;
  openingHoldsCents: number;
  closingLedgerBalanceCents: number;
  closingAvailableBalanceCents: number;
  closingHoldsCents: number;
  postedRows: AccountStatementRow[];
  holdRows: AccountStatementRow[];
};

function accountNet(postings: StatementPosting[], accountCode: string) {
  return postings
    .filter((posting) => posting.accountCode === accountCode)
    .reduce((amount, posting) => amount + posting.creditCents - posting.debitCents, 0);
}

function availableImpact(entry: StatementJournalEntry) {
  return accountNet(entry.postings, "CUSTOMER_AVAILABLE");
}

function holdImpact(entry: StatementJournalEntry) {
  return accountNet(entry.postings, "CUSTOMER_CARD_HOLDS") + accountNet(entry.postings, "CUSTOMER_PAYMENT_HOLDS");
}

function sortEntries(a: StatementJournalEntry, b: StatementJournalEntry) {
  return a.valueDate.localeCompare(b.valueDate)
    || a.bookingTimestamp.localeCompare(b.bookingTimestamp)
    || a.id.localeCompare(b.id);
}

function rowKind(entry: StatementJournalEntry, available: number, hold: number): StatementRowKind {
  if (entry.entryType.includes("REVERSAL") || entry.entryType.includes("RETURN")) return "CORRECTION";
  if (available !== 0 && hold === 0) return "POSTED";
  if (available !== 0 && entry.entryType === "CARD_CLEARING") return "POSTED";
  return "HOLD";
}

function balances(entries: StatementJournalEntry[]) {
  const available = entries.reduce((sum, entry) => sum + availableImpact(entry), 0);
  const holds = entries.reduce((sum, entry) => sum + holdImpact(entry), 0);
  return { available, holds, ledger: available + holds };
}

export function projectAccountStatement(
  entries: StatementJournalEntry[],
  options: { statementDate: string; statementEndDate?: string; asOfBookingTimestamp?: string },
): AccountStatement {
  const statementEndDate = options.statementEndDate ?? options.statementDate;
  const visible = entries
    .filter((entry) => !options.asOfBookingTimestamp || entry.bookingTimestamp <= options.asOfBookingTimestamp)
    .sort(sortEntries);
  const beforeDate = visible.filter((entry) => entry.valueDate < options.statementDate);
  const onDate = visible.filter((entry) => entry.valueDate >= options.statementDate && entry.valueDate <= statementEndDate);
  const opening = balances(beforeDate);
  const closing = balances([...beforeDate, ...onDate]);

  let runningAvailable = opening.available;
  const rows = onDate.map((entry) => {
    const available = availableImpact(entry);
    const hold = holdImpact(entry);
    runningAvailable += available;
    return {
      journalEntryId: entry.id,
      kind: rowKind(entry, available, hold),
      entryType: entry.entryType,
      valueDate: entry.valueDate,
      bookingTimestamp: entry.bookingTimestamp,
      bookingDate: entry.bookingDate,
      referenceId: entry.referenceId,
      reversalOfReferenceId: entry.reversalOfReferenceId,
      postedAmountCents: entry.entryType === "CARD_CLEARING"
        ? -accountNet(entry.postings, "CARD_SETTLEMENT_PAYABLE")
        : available,
      availableBalanceImpactCents: available,
      holdImpactCents: hold,
      runningAvailableBalanceCents: runningAvailable,
    } satisfies AccountStatementRow;
  });

  return {
    statementDate: options.statementDate,
    statementEndDate,
    asOfBookingTimestamp: options.asOfBookingTimestamp,
    openingLedgerBalanceCents: opening.ledger,
    openingAvailableBalanceCents: opening.available,
    openingHoldsCents: opening.holds,
    closingLedgerBalanceCents: closing.ledger,
    closingAvailableBalanceCents: closing.available,
    closingHoldsCents: closing.holds,
    postedRows: rows.filter((row) => row.kind !== "HOLD"),
    holdRows: rows.filter((row) => row.kind === "HOLD"),
  };
}
