import { APPROVAL_THRESHOLD_CENTS, type PaymentStatus } from "./payment-lifecycle";

export type StandingOrderOccurrence = {
  standingOrderId: string;
  occurrenceKey: string;
  scheduledDate: string;
};

export type StandingOrderRunDecision = "RUN" | "ALREADY_PROCESSED" | "INSUFFICIENT_FUNDS";
export type StandingOrderFrequency = "DAILY" | "WEEKLY" | "MONTHLY";
export type StandingOrderOccurrenceStatus = "PENDING" | "PENDING_APPROVAL" | "SUBMITTED" | "SKIPPED" | "INSUFFICIENT_FUNDS";

export function isIsoCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return parsed.toISOString().slice(0, 10) === value;
}

export function nextStandingOrderDate(date: string, frequency: StandingOrderFrequency) {
  if (!isIsoCalendarDate(date)) throw new Error("Standing order date must be an ISO date");
  const current = new Date(`${date}T00:00:00Z`);
  if (frequency === "DAILY") current.setUTCDate(current.getUTCDate() + 1);
  if (frequency === "WEEKLY") current.setUTCDate(current.getUTCDate() + 7);
  if (frequency === "MONTHLY") {
    const day = current.getUTCDate();
    const targetMonth = current.getUTCMonth() + 1;
    const targetYear = current.getUTCFullYear() + Math.floor(targetMonth / 12);
    const monthIndex = targetMonth % 12;
    const lastDay = new Date(Date.UTC(targetYear, monthIndex + 1, 0)).getUTCDate();
    current.setUTCFullYear(targetYear, monthIndex, Math.min(day, lastDay));
  }
  return current.toISOString().slice(0, 10);
}

export function createOccurrence(standingOrderId: string, scheduledDate: string): StandingOrderOccurrence {
  if (!standingOrderId || !isIsoCalendarDate(scheduledDate)) throw new Error("Standing order occurrence requires an ID and ISO date");
  return { standingOrderId, occurrenceKey: `${standingOrderId}:${scheduledDate}`, scheduledDate };
}

export function decideStandingOrderRun(occurrence: StandingOrderOccurrence, input: { alreadyProcessed: boolean; availableCents: number; amountCents: number }): StandingOrderRunDecision {
  void occurrence;
  if (input.alreadyProcessed) return "ALREADY_PROCESSED";
  if (!Number.isSafeInteger(input.amountCents) || input.amountCents <= 0) throw new Error("Standing order amount must be positive cents");
  if (input.availableCents < input.amountCents) return "INSUFFICIENT_FUNDS";
  return "RUN";
}

export function standingOrderPaymentStatus(amountCents: number): Extract<PaymentStatus, "APPROVED" | "PENDING_APPROVAL"> {
  return amountCents > APPROVAL_THRESHOLD_CENTS ? "PENDING_APPROVAL" : "APPROVED";
}

export function standingOrderFrequencyLabel(frequency: StandingOrderFrequency) {
  return frequency[0] + frequency.slice(1).toLowerCase();
}

export function occurrenceStatusLabel(status: StandingOrderOccurrenceStatus) {
  return status.toLowerCase().replaceAll("_", " ").replace(/^\w/, (character) => character.toUpperCase());
}

export function standingOrderRecipientName(recipient: unknown) {
  if (typeof recipient === "string") return recipient;
  if (recipient && typeof recipient === "object" && "name" in recipient && typeof recipient.name === "string") return recipient.name;
  return "Unknown recipient";
}
