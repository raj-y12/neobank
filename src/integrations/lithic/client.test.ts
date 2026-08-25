import { describe, expect, it } from "vitest";
import { getCardholderAmount, type LithicTransaction } from "./client";

describe("getCardholderAmount", () => {
  it("uses the stored settlement amount for an unmatched return", () => {
    const transaction: LithicTransaction = {
      token: "return_1",
      card_token: "card_1",
      status: "UNMATCHED_RETURN",
      result: "APPROVED",
      amount: -7340,
      settled_amount: 7340,
      merchant_descriptor: "Fuel",
      merchant: null,
      created: "2026-08-25T14:47:11Z",
      updated: "2026-08-25T14:47:11Z",
      events: [{ type: "RETURN", created: "2026-08-25T14:47:11Z", amounts: { cardholder: { amount: 0, currency: "USD" }, settlement: { amount: 7340, currency: "USD" } } }],
    };

    expect(getCardholderAmount(transaction)).toBe(7340);
  });
});
