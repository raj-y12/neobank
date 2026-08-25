import { describe, expect, it } from "vitest";
import { deriveLedgerBalances, type BalancePosting } from "./ledger-balance";

describe("deriveLedgerBalances", () => {
  it("keeps held funds in ledger balance while excluding them from available balance", () => {
    const postings: BalancePosting[] = [
      { accountCode: "CUSTOMER_AVAILABLE", debitCents: 7_340, creditCents: 100_000 },
      { accountCode: "CUSTOMER_CARD_HOLDS", debitCents: 5_000, creditCents: 5_000 },
      { accountCode: "CARD_SETTLEMENT_PAYABLE", debitCents: 0, creditCents: 7_340 },
    ];

    expect(deriveLedgerBalances(postings)).toEqual({
      ledgerBalanceCents: 92_660,
      availableBalanceCents: 92_660,
      activeHoldsCents: 0,
    });
  });

  it("subtracts an active hold from available balance without changing ledger balance", () => {
    const postings: BalancePosting[] = [
      { accountCode: "CUSTOMER_AVAILABLE", debitCents: 5_000, creditCents: 100_000 },
      { accountCode: "CUSTOMER_CARD_HOLDS", debitCents: 0, creditCents: 5_000 },
    ];

    expect(deriveLedgerBalances(postings)).toEqual({
      ledgerBalanceCents: 100_000,
      availableBalanceCents: 95_000,
      activeHoldsCents: 5_000,
    });
  });
});
