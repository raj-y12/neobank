import { describe, expect, it } from "vitest";
import { authorizeHold, clearCardSettlement, openingBalance, releaseAuthorizationHold, reverseCardSettlement, settleInboundFunding, settleOutboundPayment, reverseInboundFunding, reverseOutboundPayment, reserveOutboundPayment, releaseOutboundPayment } from "./ledger";

function totals(postings: Array<{ debitCents: number; creditCents: number }>) {
  return postings.reduce((sum, posting) => ({
    debitCents: sum.debitCents + posting.debitCents,
    creditCents: sum.creditCents + posting.creditCents,
  }), { debitCents: 0, creditCents: 0 });
}

describe("double-entry ledger", () => {
  it("keeps opening balances scoped to the business account", () => {
    expect(openingBalance(10_000, "2026-08-26", { businessId: "business-2", accountId: "account-2" })).toMatchObject({
      businessId: "business-2",
      accountId: "account-2",
    });
  });

  it("opens the customer balance against safeguarded cash", () => {
    const entry = openingBalance(100_000, "2026-08-25");
    expect(totals(entry.postings)).toEqual({ debitCents: 100_000, creditCents: 100_000 });
    expect(entry.postings).toEqual(expect.arrayContaining([
      expect.objectContaining({ accountCode: "SAFEGUARDED_CASH", debitCents: 100_000 }),
      expect.objectContaining({ accountCode: "CUSTOMER_AVAILABLE", creditCents: 100_000 }),
    ]));
  });

  it("moves an authorization into a card hold without changing total funds", () => {
    const entry = authorizeHold(5_000, "tx_001", "2026-08-25");
    expect(totals(entry.postings)).toEqual({ debitCents: 5_000, creditCents: 5_000 });
    expect(entry.postings).toEqual(expect.arrayContaining([
      expect.objectContaining({ accountCode: "CUSTOMER_AVAILABLE", debitCents: 5_000 }),
      expect.objectContaining({ accountCode: "CUSTOMER_CARD_HOLDS", creditCents: 5_000 }),
    ]));
  });

  it("releases the hold and posts the final clearing amount to settlement payable", () => {
    const entry = clearCardSettlement(5_000, 7_340, "tx_001", "2026-08-27");
    expect(totals(entry.postings)).toEqual({ debitCents: 12_340, creditCents: 12_340 });
    expect(entry.postings).toEqual(expect.arrayContaining([
      expect.objectContaining({ accountCode: "CUSTOMER_CARD_HOLDS", debitCents: 5_000 }),
      expect.objectContaining({ accountCode: "CUSTOMER_AVAILABLE", creditCents: 5_000 }),
      expect.objectContaining({ accountCode: "CUSTOMER_AVAILABLE", debitCents: 7_340 }),
      expect.objectContaining({ accountCode: "CARD_SETTLEMENT_PAYABLE", creditCents: 7_340 }),
    ]));
  });

  it("force-posts a settlement when no authorization hold exists", () => {
    const entry = clearCardSettlement(0, 7_340, "tx_force_post", "2026-08-27");
    expect(entry.postings).toEqual(expect.arrayContaining([
      expect.objectContaining({ accountCode: "CUSTOMER_AVAILABLE", debitCents: 7_340 }),
      expect.objectContaining({ accountCode: "CARD_SETTLEMENT_PAYABLE", creditCents: 7_340 }),
    ]));
  });

  it("releases an authorization hold without posting a settlement", () => {
    const entry = releaseAuthorizationHold(5_000, "tx_001", "2026-08-27");
    expect(entry.entryType).toBe("CARD_AUTHORIZATION_REVERSAL");
    expect(totals(entry.postings)).toEqual({ debitCents: 5_000, creditCents: 5_000 });
    expect(entry.postings).toEqual(expect.arrayContaining([
      expect.objectContaining({ accountCode: "CUSTOMER_CARD_HOLDS", debitCents: 5_000 }),
      expect.objectContaining({ accountCode: "CUSTOMER_AVAILABLE", creditCents: 5_000 }),
    ]));
  });

  it("restores a settled amount when a merchant reverses the settlement", () => {
    const entry = reverseCardSettlement(7_340, "return_001", "tx_001", "2026-08-28");
    expect(entry.entryType).toBe("CARD_SETTLEMENT_REVERSAL");
    expect(entry.referenceId).toBe("return_001");
    expect(entry.reversalOfReferenceId).toBe("tx_001");
    expect(totals(entry.postings)).toEqual({ debitCents: 7_340, creditCents: 7_340 });
    expect(entry.postings).toEqual(expect.arrayContaining([
      expect.objectContaining({ accountCode: "CARD_SETTLEMENT_PAYABLE", debitCents: 7_340 }),
      expect.objectContaining({ accountCode: "CUSTOMER_AVAILABLE", creditCents: 7_340 }),
    ]));
  });

  it("posts an unmatched settlement return without an original linkage", () => {
    const entry = reverseCardSettlement(7_340, "return_002", undefined, "2026-08-28");
    expect(entry.entryType).toBe("CARD_SETTLEMENT_REVERSAL");
    expect(entry.referenceId).toBe("return_002");
    expect(entry.reversalOfReferenceId).toBeUndefined();
    expect(totals(entry.postings)).toEqual({ debitCents: 7_340, creditCents: 7_340 });
  });

  it("posts inbound funding and its immutable return", () => {
    expect(settleInboundFunding(25_000, "fund_1", "2026-08-25").postings).toEqual(expect.arrayContaining([
      expect.objectContaining({ accountCode: "SAFEGUARDED_CASH", debitCents: 25_000 }),
      expect.objectContaining({ accountCode: "CUSTOMER_AVAILABLE", creditCents: 25_000 }),
    ]));
    expect(reverseInboundFunding(25_000, "fund_return_1", "fund_1", "2026-08-28").reversalOfReferenceId).toBe("fund_1");
  });

  it("posts outbound settlement and its immutable return", () => {
    expect(settleOutboundPayment(12_000, "pay_1", "2026-08-25").postings).toEqual(expect.arrayContaining([
      expect.objectContaining({ accountCode: "CUSTOMER_PAYMENT_HOLDS", debitCents: 12_000 }),
      expect.objectContaining({ accountCode: "SAFEGUARDED_CASH", creditCents: 12_000 }),
    ]));
    expect(reverseOutboundPayment(12_000, "pay_return_1", "pay_1", "2026-08-28").reversalOfReferenceId).toBe("pay_1");
  });

  it("reserves outbound funds and releases them when a pending payment returns", () => {
    expect(reserveOutboundPayment(12_000, "pay_1", "2026-08-25").postings).toEqual(expect.arrayContaining([
      expect.objectContaining({ accountCode: "CUSTOMER_AVAILABLE", debitCents: 12_000 }),
      expect.objectContaining({ accountCode: "CUSTOMER_PAYMENT_HOLDS", creditCents: 12_000 }),
    ]));
    expect(releaseOutboundPayment(12_000, "pay_return_1", "pay_1", "2026-08-26").postings).toEqual(expect.arrayContaining([
      expect.objectContaining({ accountCode: "CUSTOMER_PAYMENT_HOLDS", debitCents: 12_000 }),
      expect.objectContaining({ accountCode: "CUSTOMER_AVAILABLE", creditCents: 12_000 }),
    ]));
  });
});
