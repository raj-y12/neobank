import { describe, expect, it } from "vitest";
import { deriveLedgerBalances, type BalancePosting } from "./ledger-balance";

describe("deriveLedgerBalances", () => {
  it("includes payment holds in total ledger funds while available is already reduced", () => {
    expect(deriveLedgerBalances([
      { businessId: "b1", accountId: "a1", accountCode: "CUSTOMER_AVAILABLE", debitCents: 2_000, creditCents: 10_000 },
      { businessId: "b1", accountId: "a1", accountCode: "CUSTOMER_PAYMENT_HOLDS", debitCents: 0, creditCents: 2_000 },
    ], { businessId: "b1", accountId: "a1" })).toEqual({
      ledgerBalanceCents: 10_000,
      availableBalanceCents: 8_000,
      activeHoldsCents: 0,
    });
  });

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

  it("derives balances only for the requested business account scope", () => {
    const postings: BalancePosting[] = [
      { businessId: "business_1", accountId: "account_1", accountCode: "CUSTOMER_AVAILABLE", debitCents: 0, creditCents: 10_000 },
      { businessId: "business_2", accountId: "account_2", accountCode: "CUSTOMER_AVAILABLE", debitCents: 0, creditCents: 99_000 },
    ];

    expect(deriveLedgerBalances(postings, { businessId: "business_1", accountId: "account_1" }).ledgerBalanceCents).toBe(10_000);
  });
});
