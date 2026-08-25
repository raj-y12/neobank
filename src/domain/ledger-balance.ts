export type BalancePosting = {
  accountCode: string;
  debitCents: number;
  creditCents: number;
};

export type LedgerBalances = {
  ledgerBalanceCents: number;
  availableBalanceCents: number;
  activeHoldsCents: number;
};

function liabilityBalance(postings: BalancePosting[], accountCode: string) {
  return postings
    .filter((posting) => posting.accountCode === accountCode)
    .reduce((balance, posting) => balance + posting.creditCents - posting.debitCents, 0);
}

export function deriveLedgerBalances(postings: BalancePosting[]): LedgerBalances {
  const availableBalanceCents = liabilityBalance(postings, "CUSTOMER_AVAILABLE");
  const activeHoldsCents = liabilityBalance(postings, "CUSTOMER_CARD_HOLDS");

  return {
    ledgerBalanceCents: availableBalanceCents + activeHoldsCents,
    availableBalanceCents,
    activeHoldsCents,
  };
}
