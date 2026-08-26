import { describe, expect, it } from "vitest";
import { orderPaymentRailEvents, reducePaymentRailEvents } from "./payment-rail-events";

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
});
