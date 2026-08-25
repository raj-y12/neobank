export type BalancePosting = {
  businessId?: string | null;
  accountId?: string | null;
  accountCode: string;
  debitCents: number;
  creditCents: number;
};

export type LedgerBalances = {
  ledgerBalanceCents: number;
  availableBalanceCents: number;
  activeHoldsCents: number;
};

export type LedgerScope = { businessId: string; accountId: string };

function liabilityBalance(postings: BalancePosting[], accountCode: string) {
  return postings
    .filter((posting) => posting.accountCode === accountCode)
    .reduce((balance, posting) => balance + posting.creditCents - posting.debitCents, 0);
}

export function deriveLedgerBalances(postings: BalancePosting[], scope?: LedgerScope): LedgerBalances {
  const scopedPostings = scope
    ? postings.filter((posting) => posting.businessId === scope.businessId && posting.accountId === scope.accountId)
    : postings;
  const availableBalanceCents = liabilityBalance(scopedPostings, "CUSTOMER_AVAILABLE");
  const activeHoldsCents = liabilityBalance(scopedPostings, "CUSTOMER_CARD_HOLDS");
  const paymentHoldsCents = liabilityBalance(scopedPostings, "CUSTOMER_PAYMENT_HOLDS");

  return {
    ledgerBalanceCents: availableBalanceCents + activeHoldsCents + paymentHoldsCents,
    availableBalanceCents,
    activeHoldsCents,
  };
}
