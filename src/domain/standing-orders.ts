export type StandingOrderOccurrence = {
  standingOrderId: string;
  occurrenceKey: string;
  scheduledDate: string;
};

export type StandingOrderRunDecision = "RUN" | "ALREADY_PROCESSED" | "INSUFFICIENT_FUNDS";

export function createOccurrence(standingOrderId: string, scheduledDate: string): StandingOrderOccurrence {
  if (!standingOrderId || !/^\d{4}-\d{2}-\d{2}$/.test(scheduledDate)) throw new Error("Standing order occurrence requires an ID and ISO date");
  return { standingOrderId, occurrenceKey: `${standingOrderId}:${scheduledDate}`, scheduledDate };
}

export function decideStandingOrderRun(occurrence: StandingOrderOccurrence, input: { alreadyProcessed: boolean; availableCents: number; amountCents: number }): StandingOrderRunDecision {
  void occurrence;
  if (input.alreadyProcessed) return "ALREADY_PROCESSED";
  if (!Number.isSafeInteger(input.amountCents) || input.amountCents <= 0) throw new Error("Standing order amount must be positive cents");
  if (input.availableCents < input.amountCents) return "INSUFFICIENT_FUNDS";
  return "RUN";
}
