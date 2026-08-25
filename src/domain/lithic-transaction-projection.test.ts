import { describe, expect, it } from "vitest";
import { projectLithicTransaction } from "./lithic-transaction-projection";

describe("projectLithicTransaction", () => {
  it("projects an authorization into our internal transaction and active hold", () => {
    const projection = projectLithicTransaction({
      providerEventId: "webhook_auth_1",
      payload: {
        token: "lithic_tx_1",
        card_token: "card_1",
        status: "PENDING",
        settled_amount: 0,
        events: [{
          type: "AUTHORIZATION",
          created: "2026-08-25T12:00:00Z",
          amounts: { cardholder: { amount: 5000 }, hold: { amount: 5000 } },
        }],
      },
    });

    expect(projection.transaction.providerTransactionId).toBe("lithic_tx_1");
    expect(projection.transaction.status).toBe("PENDING");
    expect(projection.transaction.authorizationAmountCents).toBe(5000);
    expect(projection.hold).toEqual({ amountCents: 5000, status: "ACTIVE" });
    expect(projection.event.eventType).toBe("AUTHORIZATION");
  });

  it("projects clearing on the same provider transaction and releases the hold", () => {
    const projection = projectLithicTransaction({
      providerEventId: "webhook_clear_1",
      payload: {
        token: "lithic_tx_1",
        card_token: "card_1",
        status: "SETTLED",
        authorization_amount: 5000,
        settled_amount: 7340,
        events: [
          { type: "AUTHORIZATION", created: "2026-08-25T12:00:00Z", amounts: { cardholder: { amount: 5000 }, hold: { amount: 5000 } } },
          { type: "CLEARING", created: "2026-08-27T12:00:00Z", amounts: { settlement: { amount: 7340 }, hold: { amount: 5000 } } },
        ],
      },
    });

    expect(projection.transaction.providerTransactionId).toBe("lithic_tx_1");
    expect(projection.transaction.settledAmountCents).toBe(7340);
    expect(projection.hold).toEqual({ amountCents: 5000, status: "RELEASED" });
    expect(projection.event.eventType).toBe("CLEARING");
    expect(projection.event.settlementAmountCents).toBe(7340);
  });

  it("releases an authorization hold when the provider reverses it", () => {
    const projection = projectLithicTransaction({
      providerEventId: "webhook_reversal_1",
      payload: {
        token: "lithic_tx_1",
        card_token: "card_1",
        status: "REVERSED",
        authorization_amount: 5000,
        settled_amount: 0,
        events: [
          { type: "AUTHORIZATION", created: "2026-08-25T12:00:00Z", amounts: { cardholder: { amount: 5000 }, hold: { amount: 5000 } } },
          { type: "REVERSAL", created: "2026-08-26T12:00:00Z", amounts: { hold: { amount: 5000 } } },
        ],
      },
    });

    expect(projection.event.eventType).toBe("REVERSAL");
    expect(projection.hold).toEqual({ amountCents: 5000, status: "RELEASED" });
  });

  it("marks a linked return as a reversal of the original internal transaction", () => {
    const projection = projectLithicTransaction({
      providerEventId: "webhook_return_1",
      reversalOfTransactionId: "internal_tx_1",
      payload: {
        token: "lithic_return_1",
        card_token: "card_1",
        status: "SETTLED",
        settled_amount: -7340,
        events: [{ type: "RETURN", created: "2026-08-29T12:00:00Z", amounts: { settlement: { amount: 7340 } } }],
      },
    });

    expect(projection.transaction.status).toBe("SETTLED");
    expect(projection.transaction.reversalOfTransactionId).toBe("internal_tx_1");
    expect(projection.event.eventType).toBe("RETURN");
    expect(projection.event.settlementAmountCents).toBe(7340);
  });

  it("marks an unlinked return without creating a reversal relationship", () => {
    const projection = projectLithicTransaction({
      providerEventId: "webhook_return_2",
      payload: {
        token: "lithic_return_2",
        card_token: "card_1",
        status: "SETTLED",
        settled_amount: -7340,
        events: [{ type: "RETURN", created: "2026-08-29T12:00:00Z", amounts: { settlement: { amount: 7340 } } }],
      },
    });

    expect(projection.transaction.status).toBe("UNMATCHED_RETURN");
    expect(projection.transaction.reversalOfTransactionId).toBeUndefined();
  });
});
