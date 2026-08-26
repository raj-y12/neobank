import { describe, expect, it } from "vitest";
import { planLithicLifecycle, type LithicSnapshot } from "./lithic-lifecycle";

const auth = { token: "event_auth_1", type: "AUTHORIZATION", result: "APPROVED", created: "2026-08-25T10:00:00Z", amounts: { cardholder: { amount: -5_000 }, settlement: null } };
const clearOne = { token: "event_clear_1", type: "CLEARING", result: "APPROVED", created: "2026-08-26T10:00:00Z", amounts: { cardholder: { amount: -3_000 }, settlement: { amount: 0 } } };
const clearTwo = { token: "event_clear_2", type: "CLEARING", result: "APPROVED", created: "2026-08-27T10:00:00Z", amounts: { cardholder: { amount: -2_000 }, settlement: null } };

function snapshot(webhookId: string, receivedAt: string, payload: LithicSnapshot["payload"]): LithicSnapshot {
  return { webhookId, receivedAt, payload };
}

describe("planLithicLifecycle", () => {
  it("normalizes every nested event and derives zero or absent settlement amounts from cumulative totals", () => {
    const plan = planLithicLifecycle([
      snapshot("delivery_auth", "2026-08-25T10:00:02Z", { token: "tx_1", card_token: "card_1", status: "PENDING", settled_amount: 0, amounts: { hold: { amount: -5_000 } }, events: [auth] }),
      snapshot("delivery_clear_1", "2026-08-26T10:00:02Z", { token: "tx_1", card_token: "card_1", status: "PENDING", settled_amount: -3_000, amounts: { hold: { amount: -2_000 } }, events: [auth, clearOne] }),
      snapshot("delivery_clear_2", "2026-08-27T10:00:02Z", { token: "tx_1", card_token: "card_1", status: "SETTLED", settled_amount: -5_000, amounts: { hold: { amount: 0 } }, events: [auth, clearOne, clearTwo] }),
    ], { now: "2026-08-27T10:00:03Z" });

    expect(plan.events.map((event) => event.semanticEventId)).toEqual(["event_auth_1", "event_clear_1", "event_clear_2"]);
    expect(plan.events.map((event) => event.settlementDeltaCents)).toEqual([0, 3_000, 2_000]);
    expect(plan.events.map((event) => event.remainingHoldCents)).toEqual([5_000, 2_000, 0]);
    expect(plan.commands.map((command) => command.idempotencyKey)).toEqual([
      "lithic:event_auth_1:authorization",
      "lithic:event_clear_1:clearing",
      "lithic:event_clear_2:clearing",
    ]);
  });

  it("deduplicates the same semantic lifecycle events delivered under a new webhook ID", () => {
    const payload = { token: "tx_1", card_token: "card_1", status: "SETTLED", settled_amount: -5_000, amounts: { hold: { amount: 0 } }, events: [auth, { ...clearOne, amounts: { ...clearOne.amounts, settlement: { amount: -5_000 } } }] };
    const plan = planLithicLifecycle([
      snapshot("delivery_1", "2026-08-26T10:00:01Z", payload),
      snapshot("delivery_replay", "2026-08-26T10:01:01Z", payload),
    ], { now: "2026-08-26T10:01:02Z" });
    expect(plan.events).toHaveLength(2);
    expect(plan.commands).toHaveLength(2);
  });

  it("ignores declined monetary events", () => {
    const declined = { ...auth, token: "event_declined_1", result: "DECLINED" };
    const plan = planLithicLifecycle([
      snapshot("delivery_declined", "2026-08-25T10:00:01Z", { token: "tx_declined", card_token: "card_1", status: "DECLINED", settled_amount: 0, amounts: { hold: { amount: 0 } }, events: [declined] }),
    ], { now: "2026-08-25T10:00:02Z" });
    expect(plan.events[0]).toMatchObject({ semanticEventId: "event_declined_1", disposition: "IGNORED", remainingHoldCents: 0 });
    expect(plan.commands).toEqual([]);
  });

  it("recomputes an out-of-order clearing after its authorization arrives", () => {
    const clearingPayload = { token: "tx_1", card_token: "card_1", status: "SETTLED", settled_amount: -5_000, amounts: { hold: { amount: 0 } }, events: [{ ...clearOne, amounts: { ...clearOne.amounts, settlement: { amount: -5_000 } } }] };
    const parked = planLithicLifecycle([snapshot("delivery_clear", "2026-08-25T10:00:00Z", clearingPayload)], { now: "2026-08-25T10:05:00Z" });
    const replayed = planLithicLifecycle([
      snapshot("delivery_clear", "2026-08-25T10:00:00Z", clearingPayload),
      snapshot("delivery_auth", "2026-08-25T10:06:00Z", { token: "tx_1", card_token: "card_1", status: "PENDING", settled_amount: 0, amounts: { hold: { amount: -5_000 } }, events: [auth] }),
    ], { now: "2026-08-25T10:06:01Z" });
    expect(parked.events[0].disposition).toBe("PARKED");
    expect(replayed.events.map((event) => [event.semanticEventId, event.disposition, event.holdReleaseCents])).toEqual([
      ["event_auth_1", "READY", 0],
      ["event_clear_1", "READY", 5_000],
    ]);
  });

  it("promotes an unmatched clearing to force-post only after the fifteen minute grace", () => {
    const payload = { token: "tx_force", card_token: "card_1", status: "SETTLED", settled_amount: -5_000, events: [{ ...clearOne, token: "event_force_1", amounts: { ...clearOne.amounts, settlement: { amount: -5_000 } } }] };
    const delivery = snapshot("delivery_force", "2026-08-25T10:00:00Z", payload);
    expect(planLithicLifecycle([delivery], { now: "2026-08-25T10:14:59Z" }).events[0].disposition).toBe("PARKED");
    const promoted = planLithicLifecycle([delivery], { now: "2026-08-25T10:15:00Z" });
    expect(promoted.events[0]).toMatchObject({ disposition: "READY", forcePost: true, holdReleaseCents: 0 });
    expect(promoted.commands[0].entry.entryType).toBe("CARD_CLEARING");
  });

  it("does not create a stranded hold when an authorization arrives after force-post promotion", () => {
    const forceClearing = { ...clearOne, token: "event_force_late_auth", created: "2026-08-25T10:01:00Z", amounts: { ...clearOne.amounts, settlement: { amount: -5_000 } } };
    const plan = planLithicLifecycle([
      snapshot("delivery_clear", "2026-08-25T10:02:00Z", { token: "tx_force", card_token: "card_1", status: "SETTLED", settled_amount: -5_000, events: [forceClearing] }),
      snapshot("delivery_late_auth", "2026-08-25T10:20:00Z", { token: "tx_force", card_token: "card_1", status: "PENDING", settled_amount: 0, amounts: { hold: { amount: -5_000 } }, events: [auth] }),
    ], { now: "2026-08-25T10:20:01Z" });
    expect(plan.events.map((event) => [event.semanticEventId, event.disposition, event.forcePost, event.remainingHoldCents])).toEqual([
      ["event_auth_1", "IGNORED", false, 0],
      ["event_force_late_auth", "READY", true, 0],
    ]);
    expect(plan.commands.map((command) => command.idempotencyKey)).toEqual(["lithic:event_force_late_auth:clearing"]);
  });

  it("releases the full remaining hold on terminal settlement when no hold total is supplied", () => {
    const plan = planLithicLifecycle([
      snapshot("delivery_auth", "2026-08-25T10:00:01Z", { token: "tx_1", card_token: "card_1", status: "PENDING", settled_amount: 0, amounts: { hold: { amount: -5_000 } }, events: [auth] }),
      snapshot("delivery_clear", "2026-08-26T10:00:01Z", { token: "tx_1", card_token: "card_1", status: "SETTLED", settled_amount: -3_000, events: [auth, { ...clearOne, amounts: { ...clearOne.amounts, settlement: { amount: -3_000 } } }] }),
    ], { now: "2026-08-26T10:00:02Z" });
    expect(plan.events[1]).toMatchObject({ holdReleaseCents: 5_000, remainingHoldCents: 0 });
  });

  it("starts post-cutover processing from the persisted projection and excludes legacy nested events", () => {
    const plan = planLithicLifecycle([
      snapshot("delivery_v2", "2026-08-28T10:00:01Z", { token: "tx_1", card_token: "card_1", status: "SETTLED", settled_amount: -5_000, amounts: { hold: { amount: 0 } }, events: [auth, { ...clearOne, token: "new_clear", amounts: { ...clearOne.amounts, settlement: { amount: -2_000 } } }] }),
    ], { now: "2026-08-28T10:00:02Z", initialState: { remainingHoldCents: 2_000, cumulativeSettledSigned: -3_000, hasAuthorization: true }, excludedSemanticEventIds: new Set(["event_auth_1"]) });
    expect(plan.events.map((event) => event.semanticEventId)).toEqual(["new_clear"]);
    expect(plan.commands[0]).toMatchObject({ idempotencyKey: "lithic:new_clear:clearing" });
    expect(plan.events[0]).toMatchObject({ settlementDeltaCents: 2_000, holdReleaseCents: 2_000 });
  });

  it("parks multiple zero-amount clearings sharing one cumulative final snapshot as ambiguous", () => {
    const zeroOne = { ...clearOne, token: "zero_clear_1", amounts: { ...clearOne.amounts, settlement: { amount: 0 } } };
    const zeroTwo = { ...clearTwo, token: "zero_clear_2", amounts: { ...clearTwo.amounts, settlement: null } };
    const plan = planLithicLifecycle([
      snapshot("delivery_final", "2026-08-28T10:00:01Z", { token: "tx_1", card_token: "card_1", status: "SETTLED", settled_amount: -5_000, amounts: { hold: { amount: 0 } }, events: [auth, zeroOne, zeroTwo] }),
    ], { now: "2026-08-28T10:00:02Z" });
    expect(plan.events.filter((event) => event.type === "CLEARING").map((event) => event.disposition)).toEqual(["AMBIGUOUS", "AMBIGUOUS"]);
    expect(plan.commands.filter((command) => command.entry.entryType === "CARD_CLEARING")).toEqual([]);
  });

  it("parks a monetary event without a provider event token and never invents an economic key", () => {
    const plan = planLithicLifecycle([
      snapshot("delivery_missing_token", "2026-08-28T10:00:01Z", { token: "tx_1", card_token: "card_1", status: "SETTLED", settled_amount: -5_000, events: [{ ...clearOne, token: undefined, amounts: { ...clearOne.amounts, settlement: { amount: -5_000 } } }] }),
    ], { now: "2026-08-28T10:20:02Z" });
    expect(plan.events[0].disposition).toBe("AMBIGUOUS");
    expect(plan.commands).toEqual([]);
  });
});
