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
