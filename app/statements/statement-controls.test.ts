import { describe, expect, it } from "vitest";
import { compareStatementRowsLatestFirst, datetimeLocalToIso, isTransactionsOnlyView, parseStatementDate } from "./statement-controls";

describe("statement controls", () => {
  it("accepts real UTC calendar dates and rejects malformed dates", () => {
    expect(parseStatementDate("2026-08-25")).toBe("2026-08-25");
    expect(parseStatementDate("2026-02-30")).toBeNull();
    expect(parseStatementDate("25-08-2026")).toBeNull();
  });

  it("converts datetime-local values to an exact ISO cutoff", () => {
    expect(datetimeLocalToIso("2026-08-26T23:59")).toBe("2026-08-26T23:59:00.000Z");
    expect(datetimeLocalToIso("bad")).toBeNull();
  });

  it("recognizes the list-only transactions view", () => {
    expect(isTransactionsOnlyView("transactions")).toBe(true);
    expect(isTransactionsOnlyView(undefined)).toBe(false);
  });

  it("orders transaction rows latest first", () => {
    expect(compareStatementRowsLatestFirst({ valueDate: "2026-08-25", bookingTimestamp: "2026-08-25T10:00:00Z", journalEntryId: "a" }, { valueDate: "2026-08-26", bookingTimestamp: "2026-08-26T10:00:00Z", journalEntryId: "b" })).toBeGreaterThan(0);
  });
});
