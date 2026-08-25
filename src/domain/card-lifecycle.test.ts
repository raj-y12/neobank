import { describe, expect, it } from "vitest";
import {
  authorizeCardTransaction,
  clearCardTransaction,
  reverseCardSettlement,
} from "./card-lifecycle";

describe("card authorization", () => {
  it("creates a hold without changing the ledger balance", () => {
    const result = authorizeCardTransaction({
      accountId: "acct_demo",
      transactionId: "card_tx_demo",
      amountCents: 5_000,
      ledgerBalanceCents: 100_000,
    });

    expect(result.ledgerBalanceCents).toBe(100_000);
    expect(result.activeHoldCents).toBe(5_000);
    expect(result.availableBalanceCents).toBe(95_000);
    expect(result.status).toBe("PENDING");
  });

  it("releases the hold and posts the final clearing amount", () => {
    const authorized = authorizeCardTransaction({
      accountId: "acct_demo",
      transactionId: "card_tx_demo",
      amountCents: 5_000,
      ledgerBalanceCents: 100_000,
    });

    const settled = clearCardTransaction(authorized, 7_340);

    expect(settled.authorizationAmountCents).toBe(5_000);
    expect(settled.settlementAmountCents).toBe(7_340);
    expect(settled.activeHoldCents).toBe(0);
    expect(settled.ledgerBalanceCents).toBe(92_660);
    expect(settled.availableBalanceCents).toBe(92_660);
    expect(settled.status).toBe("SETTLED");
  });

  it("creates a linked reversal without editing the settlement", () => {
    const authorized = authorizeCardTransaction({
      accountId: "acct_demo",
      transactionId: "card_tx_demo",
      amountCents: 5_000,
      ledgerBalanceCents: 100_000,
    });
    const settled = clearCardTransaction(authorized, 7_340);

    const reversal = reverseCardSettlement(settled, "card_reversal_demo");

    expect(settled.status).toBe("SETTLED");
    expect(reversal.reversesTransactionId).toBe("card_tx_demo");
    expect(reversal.reversalAmountCents).toBe(7_340);
    expect(reversal.ledgerBalanceCents).toBe(100_000);
    expect(reversal.availableBalanceCents).toBe(100_000);
    expect(reversal.status).toBe("REVERSED");
  });
});
