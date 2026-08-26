import { describe, expect, it } from "vitest";
import { orderPaymentRailEvents, reducePaymentRailEvents, replayFundingRailLifecycle, replayPaymentRailLifecycle } from "./payment-rail-events";

describe("payment rail event ordering", () => {
  it("orders delivery by provider occurrence time, not receipt time", () => {
    const events = [
      { providerEventId: "return", status: "RETURNED" as const, occurredAt: "2026-08-28T00:00:00Z", receivedAt: "2026-08-27T00:00:00Z" },
      { providerEventId: "settle", status: "SETTLED" as const, occurredAt: "2026-08-27T00:00:00Z", receivedAt: "2026-08-28T00:00:00Z" },
    ];
    expect(orderPaymentRailEvents(events).map((event) => event.providerEventId)).toEqual(["settle", "return"]);
  });

  it("reduces a replayed out-of-order sequence to one settlement and one return", () => {
    expect(reducePaymentRailEvents([
      { providerEventId: "return", status: "RETURNED", occurredAt: "2026-08-28T00:00:00Z", receivedAt: "2026-08-27T00:00:00Z" },
      { providerEventId: "settle", status: "SETTLED", occurredAt: "2026-08-27T00:00:00Z", receivedAt: "2026-08-28T00:00:00Z" },
      { providerEventId: "settle", status: "SETTLED", occurredAt: "2026-08-27T00:00:00Z", receivedAt: "2026-08-29T00:00:00Z" },
    ])).toEqual(["SETTLED", "RETURNED"]);
  });

  it("revisits a parked payment return after its submission prerequisite arrives", () => {
    const result = replayPaymentRailLifecycle("APPROVED", [
      { providerEventId: "return", status: "RETURNED", occurredAt: "2026-08-28T00:00:00Z", receivedAt: "2026-08-27T00:00:00Z" },
      { providerEventId: "submit", status: "SUBMITTED", occurredAt: "2026-08-29T00:00:00Z", receivedAt: "2026-08-29T00:00:00Z" },
    ]);

    expect(result.status).toBe("RETURNED");
    expect(result.transitions.map((transition) => transition.event.providerEventId)).toEqual(["submit", "return"]);
    expect(result.transitions[1]?.fromStatus).toBe("SUBMITTED");
  });

  it("replays funding settlement and return exactly once", () => {
    const result = replayFundingRailLifecycle("PENDING", [
      { providerEventId: "return", status: "RETURNED", occurredAt: "2026-08-28T00:00:00Z", receivedAt: "2026-08-29T00:00:00Z" },
      { providerEventId: "settle", status: "SETTLED", occurredAt: "2026-08-27T00:00:00Z", receivedAt: "2026-08-29T00:00:00Z" },
      { providerEventId: "settle-replay", status: "SETTLED", occurredAt: "2026-08-27T00:00:00Z", receivedAt: "2026-08-30T00:00:00Z" },
    ]);

    expect(result.status).toBe("RETURNED");
    expect(result.transitions.map((transition) => transition.event.providerEventId)).toEqual(["settle", "return"]);
  });
});
