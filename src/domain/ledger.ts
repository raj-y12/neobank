export type LedgerPosting = {
  accountCode: string;
  debitCents: number;
  creditCents: number;
};

export type JournalEntry = {
  entryType: string;
  valueDate: string;
  referenceId?: string;
  postings: LedgerPosting[];
};

function entry(entryType: string, valueDate: string, postings: LedgerPosting[], referenceId?: string): JournalEntry {
  const debitCents = postings.reduce((sum, posting) => sum + posting.debitCents, 0);
  const creditCents = postings.reduce((sum, posting) => sum + posting.creditCents, 0);
  if (debitCents !== creditCents) throw new Error("Journal entry is not balanced");
  return { entryType, valueDate, referenceId, postings };
}

export function openingBalance(amountCents: number, valueDate: string) {
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) throw new Error("Opening balance must be positive cents");
  return entry("OPENING_BALANCE", valueDate, [
    { accountCode: "SAFEGUARDED_CASH", debitCents: amountCents, creditCents: 0 },
    { accountCode: "CUSTOMER_AVAILABLE", debitCents: 0, creditCents: amountCents },
  ]);
}

export function authorizeHold(amountCents: number, transactionId: string, valueDate: string) {
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) throw new Error("Hold amount must be positive cents");
  return entry("CARD_AUTHORIZATION_HOLD", valueDate, [
    { accountCode: "CUSTOMER_AVAILABLE", debitCents: amountCents, creditCents: 0 },
    { accountCode: "CUSTOMER_CARD_HOLDS", debitCents: 0, creditCents: amountCents },
  ], transactionId);
}

export function clearCardSettlement(holdAmountCents: number, settlementAmountCents: number, transactionId: string, valueDate: string) {
  if (!Number.isSafeInteger(holdAmountCents) || holdAmountCents <= 0) throw new Error("Hold amount must be positive cents");
  if (!Number.isSafeInteger(settlementAmountCents) || settlementAmountCents <= 0) throw new Error("Settlement amount must be positive cents");
  return entry("CARD_CLEARING", valueDate, [
    { accountCode: "CUSTOMER_CARD_HOLDS", debitCents: holdAmountCents, creditCents: 0 },
    { accountCode: "CUSTOMER_AVAILABLE", debitCents: 0, creditCents: holdAmountCents },
    { accountCode: "CUSTOMER_AVAILABLE", debitCents: settlementAmountCents, creditCents: 0 },
    { accountCode: "CARD_SETTLEMENT_PAYABLE", debitCents: 0, creditCents: settlementAmountCents },
  ], transactionId);
}
