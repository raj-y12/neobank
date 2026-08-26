import { describe, expect, it } from "vitest";
import { processLithicLifecycle } from "./lithic-lifecycle-service";
import type { LithicSnapshot, PlannedLithicCommand, PlannedLithicEvent } from "../domain/lithic-lifecycle";

const auth = { token: "auth_1", type: "AUTHORIZATION", result: "APPROVED", created: "2026-08-25T10:00:00Z", amounts: { cardholder: { amount: -5_000 }, settlement: null } };
const clearing = { token: "clear_1", type: "CLEARING", result: "APPROVED", created: "2026-08-25T10:01:00Z", amounts: { cardholder: { amount: -5_000 }, settlement: { amount: -5_000 } } };

function snapshots(): LithicSnapshot[] {
  return [
    { webhookId: "delivery_auth", receivedAt: "2026-08-25T10:00:01Z", payload: { token: "tx_1", card_token: "card_1", status: "PENDING", settled_amount: 0, amounts: { hold: { amount: -5_000 } }, events: [auth] } },
    { webhookId: "delivery_clear", receivedAt: "2026-08-25T10:01:01Z", payload: { token: "tx_1", card_token: "card_1", status: "SETTLED", settled_amount: -5_000, amounts: { hold: { amount: 0 } }, events: [auth, clearing] } },
  ];
}

describe("processLithicLifecycle", () => {
  it("recovers a projection-before-ledger failure without duplicate economic effect", async () => {
    const projected = new Map<string, PlannedLithicEvent>();
    const journal = new Map<string, PlannedLithicCommand>();
    let failOnce = true;
    const dependencies = {
      project: async (event: PlannedLithicEvent) => { projected.set(event.semanticEventId, event); },
      park: async () => {},
      markMatched: async () => {},
      record: async (command: PlannedLithicCommand) => {
        if (command.semanticEventId === "clear_1" && failOnce) { failOnce = false; throw new Error("database unavailable"); }
        journal.set(command.idempotencyKey, command);
      },
    };

    await expect(processLithicLifecycle(snapshots(), { now: "2026-08-25T10:01:02Z" }, dependencies)).rejects.toThrow("database unavailable");
    await processLithicLifecycle(snapshots(), { now: "2026-08-25T10:01:03Z" }, dependencies);
    await processLithicLifecycle(snapshots(), { now: "2026-08-25T10:01:04Z" }, dependencies);

    expect([...journal.keys()]).toEqual(["lithic:auth_1:authorization", "lithic:clear_1:clearing"]);
    expect(projected.get("clear_1")?.remainingHoldCents).toBe(0);
  });

  it("does not project a parked clearing and recomputes it after out-of-order authorization arrives", async () => {
    const projected: PlannedLithicEvent[] = [];
    const parked: PlannedLithicEvent[] = [];
    const dependencies = {
      project: async (event: PlannedLithicEvent) => { projected.push(event); },
      park: async (event: PlannedLithicEvent) => { parked.push(event); },
      markMatched: async () => {},
      record: async () => {},
    };
    const clearingOnly: LithicSnapshot = snapshots()[1];
    clearingOnly.payload.events = [clearing];
    await processLithicLifecycle([clearingOnly], { now: "2026-08-25T10:05:00Z" }, dependencies);
    expect(projected).toEqual([]);
    expect(parked).toHaveLength(1);

    await processLithicLifecycle([clearingOnly, snapshots()[0]], { now: "2026-08-25T10:06:00Z" }, dependencies);
    expect(projected.slice(-2).map((event) => [event.semanticEventId, event.holdReleaseCents])).toEqual([["auth_1", 0], ["clear_1", 5_000]]);
  });

  it("promotes an aged unmatched clearing and ignores a declined delivery through the service boundary", async () => {
    const projected: PlannedLithicEvent[] = [];
    const recorded: PlannedLithicCommand[] = [];
    const dependencies = {
      project: async (event: PlannedLithicEvent) => { projected.push(event); },
      park: async () => {},
      markMatched: async () => {},
      record: async (command: PlannedLithicCommand) => { recorded.push(command); },
    };
    await processLithicLifecycle([{
      webhookId: "delivery_force",
      receivedAt: "2026-08-25T10:00:00Z",
      payload: { token: "tx_force", card_token: "card_1", status: "SETTLED", settled_amount: -5_000, events: [{ ...clearing, token: "force_1" }] },
    }], { now: "2026-08-25T10:15:00Z" }, dependencies);
    await processLithicLifecycle([{
      webhookId: "delivery_declined",
      receivedAt: "2026-08-25T10:16:00Z",
      payload: { token: "tx_declined", card_token: "card_1", status: "DECLINED", settled_amount: 0, amounts: { hold: { amount: 0 } }, events: [{ ...auth, token: "declined_1", result: "DECLINED" }] },
    }], { now: "2026-08-25T10:16:01Z" }, dependencies);
    expect(projected.map((event) => [event.semanticEventId, event.disposition, event.forcePost])).toEqual([
      ["force_1", "READY", true],
      ["declined_1", "IGNORED", false],
    ]);
    expect(recorded.map((command) => command.idempotencyKey)).toEqual(["lithic:force_1:clearing"]);
  });
});
