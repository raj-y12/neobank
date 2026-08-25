import { describe, expect, it } from "vitest";
import { validateReturnLink, type CardReversalIntent } from "./card-reversal";

const intent: CardReversalIntent = {
  id: "intent_1",
  originalTransactionId: "internal_tx_1",
  cardToken: "card_1",
  expectedAmountCents: 7_340,
  providerReturnTransactionId: null,
  status: "PENDING",
  idempotencyKey: "intent_1",
};

describe("validateReturnLink", () => {
  it("accepts a return for the expected card and amount", () => {
    expect(() => validateReturnLink({ intent, returnCardToken: "card_1", returnAmountCents: 7_340 })).not.toThrow();
  });

  it("rejects a return from a different card", () => {
    expect(() => validateReturnLink({ intent, returnCardToken: "card_2", returnAmountCents: 7_340 })).toThrow("card");
  });

  it("rejects a return with a different amount", () => {
    expect(() => validateReturnLink({ intent, returnCardToken: "card_1", returnAmountCents: 5_000 })).toThrow("amount");
  });
});
