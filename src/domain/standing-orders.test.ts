import { describe, expect, it } from "vitest";
import { createOccurrence, decideStandingOrderRun, isIsoCalendarDate, nextStandingOrderDate, occurrenceStatusLabel, standingOrderFrequencyLabel, standingOrderPaymentStatus, standingOrderRecipientName } from "./standing-orders";

describe("standing orders", () => {
  it("creates a deterministic occurrence identity for a scheduled date", () => {
    expect(createOccurrence("so-1", "2026-08-26")).toEqual({
      standingOrderId: "so-1",
      occurrenceKey: "so-1:2026-08-26",
      scheduledDate: "2026-08-26",
    });
  });

  it("rejects impossible calendar dates", () => {
    expect(isIsoCalendarDate("2026-02-30")).toBe(false);
    expect(() => createOccurrence("so-1", "2026-02-30")).toThrow("ISO date");
  });

  it("runs an occurrence once and parks it when funds are insufficient", () => {
    const occurrence = createOccurrence("so-1", "2026-08-26");
    expect(decideStandingOrderRun(occurrence, { alreadyProcessed: false, availableCents: 10_000, amountCents: 5_000 })).toBe("RUN");
    expect(decideStandingOrderRun(occurrence, { alreadyProcessed: true, availableCents: 10_000, amountCents: 5_000 })).toBe("ALREADY_PROCESSED");
    expect(decideStandingOrderRun(occurrence, { alreadyProcessed: false, availableCents: 1_000, amountCents: 5_000 })).toBe("INSUFFICIENT_FUNDS");
  });

  it("puts above-threshold payments into the approval queue", () => {
    expect(standingOrderPaymentStatus(100_001)).toBe("PENDING_APPROVAL");
    expect(standingOrderPaymentStatus(100_000)).toBe("APPROVED");
  });

  it("advances daily, weekly, and month-end schedules without creating impossible dates", () => {
    expect(nextStandingOrderDate("2026-08-26", "DAILY")).toBe("2026-08-27");
    expect(nextStandingOrderDate("2026-08-26", "WEEKLY")).toBe("2026-09-02");
    expect(nextStandingOrderDate("2026-01-31", "MONTHLY")).toBe("2026-02-28");
  });

  it("provides stable labels for the management view", () => {
    expect(standingOrderFrequencyLabel("WEEKLY")).toBe("Weekly");
    expect(occurrenceStatusLabel("INSUFFICIENT_FUNDS")).toBe("Insufficient funds");
    expect(standingOrderRecipientName({ name: "Acme" })).toBe("Acme");
    expect(standingOrderRecipientName("Acme")).toBe("Acme");
  });
});
