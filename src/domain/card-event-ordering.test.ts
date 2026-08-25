import { describe, expect, it } from "vitest";
import { reconcileCardEvents, type CardProviderEvent } from "./card-event-ordering";

describe("reconcileCardEvents", () => {
  it("parks clearing until its authorization arrives, then releases both in order", () => {
    const clearing: CardProviderEvent = { providerEventId: "clear_1", transactionId: "tx_1", eventType: "CLEARING", occurredAt: "2026-08-25T12:02:00Z" };
    const authorization: CardProviderEvent = { providerEventId: "auth_1", transactionId: "tx_1", eventType: "AUTHORIZATION", occurredAt: "2026-08-25T12:01:00Z" };

    expect(reconcileCardEvents([clearing])).toEqual({ ready: [], parked: [clearing] });
    expect(reconcileCardEvents([clearing, authorization])).toEqual({ ready: [authorization, clearing], parked: [] });
  });

  it("does not park returns because they credit immediately", () => {
    const returned: CardProviderEvent = { providerEventId: "return_1", transactionId: "tx_return", eventType: "RETURN", occurredAt: "2026-08-25T12:03:00Z" };
    expect(reconcileCardEvents([returned])).toEqual({ ready: [returned], parked: [] });
  });
});
