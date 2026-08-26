import { canTransitionFunding, canTransitionPayment, type FundingStatus, type PaymentStatus } from "./payment-lifecycle";

export type PaymentRailEventStatus = "SUBMITTED" | "SETTLED" | "RETURNED";

export type PaymentRailLifecycleEvent = {
  providerEventId: string;
  status: PaymentRailEventStatus;
  occurredAt: string;
  receivedAt: string;
};

/**
 * Provider occurrence time is authoritative. Receipt time is only a
 * deterministic tie-breaker for providers that emit the same timestamp.
 */
export function orderPaymentRailEvents<T extends PaymentRailLifecycleEvent>(events: readonly T[]): T[] {
  return [...events].sort((left, right) =>
    Date.parse(left.occurredAt) - Date.parse(right.occurredAt) ||
    Date.parse(left.receivedAt) - Date.parse(right.receivedAt) ||
    left.providerEventId.localeCompare(right.providerEventId),
  );
}

/**
 * Collapse replayed delivery into the economic lifecycle. SUBMITTED is
 * informational; settlement and return are each emitted once, in occurrence
 * order. Invalid transitions are retained for review rather than guessed.
 */
export function reducePaymentRailEvents(events: readonly PaymentRailLifecycleEvent[]): PaymentRailEventStatus[] {
  const seen = new Set<string>();
  const result: PaymentRailEventStatus[] = [];

  for (const event of orderPaymentRailEvents(events)) {
    if (seen.has(event.providerEventId)) continue;
    seen.add(event.providerEventId);
    if (event.status === "SUBMITTED") continue;
    if (!result.includes(event.status)) result.push(event.status);
  }

  return result;
}

export type PaymentRailTransition<T extends PaymentRailLifecycleEvent = PaymentRailLifecycleEvent> = {
  event: T;
  fromStatus: PaymentStatus;
  toStatus: PaymentStatus;
};

/**
 * Replays provider events until no event can advance the current payment.
 * This lets a previously parked settlement/return apply when a later delivery
 * supplies its prerequisite SUBMITTED event.
 */
export function replayPaymentRailLifecycle<T extends PaymentRailLifecycleEvent>(initialStatus: PaymentStatus, events: readonly T[]) {
  let status = initialStatus;
  const transitions: PaymentRailTransition<T>[] = [];
  let advanced = true;
  while (advanced) {
    advanced = false;
    for (const event of orderPaymentRailEvents(events)) {
      const canSubmit = event.status === "SUBMITTED" && status === "APPROVED";
      const canAdvance = event.status !== "SUBMITTED" && canTransitionPayment(status, event.status);
      if (!canSubmit && !canAdvance) continue;
      const fromStatus = status;
      status = event.status;
      transitions.push({ event, fromStatus, toStatus: status });
      advanced = true;
    }
  }
  return { status, transitions };
}

export type FundingRailTransition<T extends PaymentRailLifecycleEvent = PaymentRailLifecycleEvent> = {
  event: T;
  fromStatus: FundingStatus;
  toStatus: FundingStatus;
};

/** Replays inbound funding events while preserving the PENDING/SETTLED/RETURNED state machine. */
export function replayFundingRailLifecycle<T extends PaymentRailLifecycleEvent>(initialStatus: FundingStatus, events: readonly T[]) {
  let status = initialStatus;
  const transitions: FundingRailTransition<T>[] = [];
  let advanced = true;
  while (advanced) {
    advanced = false;
    for (const event of orderPaymentRailEvents(events)) {
      const canAdvance = event.status === "SETTLED"
        ? canTransitionFunding(status, "SETTLED")
        : event.status === "RETURNED" && canTransitionFunding(status, "RETURNED");
      if (!canAdvance) continue;
      const fromStatus = status;
      status = event.status === "SETTLED" ? "SETTLED" : "RETURNED";
      transitions.push({ event, fromStatus, toStatus: status });
      advanced = true;
    }
  }
  return { status, transitions };
}
