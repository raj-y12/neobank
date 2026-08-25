export type LedgerPosting = {
  accountCode: string;
  debitCents: number;
  creditCents: number;
};

export type JournalEntry = {
  entryType: string;
  valueDate: string;
  businessId?: string;
  accountId?: string;
  referenceId?: string;
  reversalOfReferenceId?: string;
  postings: LedgerPosting[];
};

function entry(entryType: string, valueDate: string, postings: LedgerPosting[], referenceId?: string, reversalOfReferenceId?: string): JournalEntry {
  const debitCents = postings.reduce((sum, posting) => sum + posting.debitCents, 0);
  const creditCents = postings.reduce((sum, posting) => sum + posting.creditCents, 0);
  if (debitCents !== creditCents) throw new Error("Journal entry is not balanced");
  return { entryType, valueDate, referenceId, reversalOfReferenceId, postings };
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
  if (!Number.isSafeInteger(holdAmountCents) || holdAmountCents < 0) throw new Error("Hold amount must be non-negative cents");
  if (!Number.isSafeInteger(settlementAmountCents) || settlementAmountCents <= 0) throw new Error("Settlement amount must be positive cents");
  const postings: LedgerPosting[] = [
    { accountCode: "CUSTOMER_AVAILABLE", debitCents: settlementAmountCents, creditCents: 0 },
    { accountCode: "CARD_SETTLEMENT_PAYABLE", debitCents: 0, creditCents: settlementAmountCents },
  ];
  if (holdAmountCents > 0) postings.unshift(
    { accountCode: "CUSTOMER_CARD_HOLDS", debitCents: holdAmountCents, creditCents: 0 },
    { accountCode: "CUSTOMER_AVAILABLE", debitCents: 0, creditCents: holdAmountCents },
  );
  return entry("CARD_CLEARING", valueDate, postings, transactionId);
}

export function releaseAuthorizationHold(amountCents: number, transactionId: string, valueDate: string) {
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) throw new Error("Hold amount must be positive cents");
  return entry("CARD_AUTHORIZATION_REVERSAL", valueDate, [
    { accountCode: "CUSTOMER_CARD_HOLDS", debitCents: amountCents, creditCents: 0 },
    { accountCode: "CUSTOMER_AVAILABLE", debitCents: 0, creditCents: amountCents },
  ], transactionId, transactionId);
}

export function reverseCardSettlement(amountCents: number, reversalTransactionId: string, originalTransactionId: string | undefined, valueDate: string) {
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) throw new Error("Reversal amount must be positive cents");
  return entry("CARD_SETTLEMENT_REVERSAL", valueDate, [
    { accountCode: "CARD_SETTLEMENT_PAYABLE", debitCents: amountCents, creditCents: 0 },
    { accountCode: "CUSTOMER_AVAILABLE", debitCents: 0, creditCents: amountCents },
  ], reversalTransactionId, originalTransactionId);
}

export function settleInboundFunding(amountCents: number, fundingReferenceId: string, valueDate: string) {
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) throw new Error("Funding amount must be positive cents");
  return entry("FUNDING_SETTLEMENT", valueDate, [
    { accountCode: "SAFEGUARDED_CASH", debitCents: amountCents, creditCents: 0 },
    { accountCode: "CUSTOMER_AVAILABLE", debitCents: 0, creditCents: amountCents },
  ], fundingReferenceId);
}

export function reverseInboundFunding(amountCents: number, reversalReferenceId: string, originalReferenceId: string, valueDate: string) {
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) throw new Error("Funding return amount must be positive cents");
  return entry("FUNDING_RETURN", valueDate, [
    { accountCode: "CUSTOMER_AVAILABLE", debitCents: amountCents, creditCents: 0 },
    { accountCode: "SAFEGUARDED_CASH", debitCents: 0, creditCents: amountCents },
  ], reversalReferenceId, originalReferenceId);
}

export function settleOutboundPayment(amountCents: number, paymentReferenceId: string, valueDate: string) {
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) throw new Error("Payment amount must be positive cents");
  return entry("PAYMENT_SETTLEMENT", valueDate, [
    { accountCode: "CUSTOMER_AVAILABLE", debitCents: amountCents, creditCents: 0 },
    { accountCode: "SAFEGUARDED_CASH", debitCents: 0, creditCents: amountCents },
  ], paymentReferenceId);
}

export function reverseOutboundPayment(amountCents: number, reversalReferenceId: string, originalReferenceId: string, valueDate: string) {
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) throw new Error("Payment return amount must be positive cents");
  return entry("PAYMENT_RETURN", valueDate, [
    { accountCode: "SAFEGUARDED_CASH", debitCents: amountCents, creditCents: 0 },
    { accountCode: "CUSTOMER_AVAILABLE", debitCents: 0, creditCents: amountCents },
  ], reversalReferenceId, originalReferenceId);
}
