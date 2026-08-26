import { describe, expect, it } from "vitest";
import { authorizeHold, clearCardSettlement, openingBalance, reverseCardSettlement } from "./ledger";
import { projectAccountStatement, type StatementJournalEntry } from "./account-statement";

function withMeta(entry: ReturnType<typeof openingBalance> | ReturnType<typeof authorizeHold> | ReturnType<typeof clearCardSettlement> | ReturnType<typeof reverseCardSettlement>, id: string, bookingTimestamp: string): StatementJournalEntry {
  return { ...entry, id, bookingTimestamp, bookingDate: bookingTimestamp.slice(0, 10), referenceId: entry.referenceId ?? null, reversalOfReferenceId: entry.reversalOfReferenceId ?? null };
}

const entries: StatementJournalEntry[] = [
  withMeta(openingBalance(100_000, "2026-08-20"), "opening", "2026-08-20T09:00:00Z"),
  withMeta(authorizeHold(5_000, "card-1", "2026-08-24"), "auth", "2026-08-24T10:00:00Z"),
  withMeta(clearCardSettlement(5_000, 7_340, "card-1", "2026-08-25"), "clear", "2026-08-25T10:00:00Z"),
  withMeta(reverseCardSettlement(7_340, "reversal-1", "card-1", "2026-08-25"), "reverse", "2026-08-27T10:00:00Z"),
];

describe("projectAccountStatement", () => {
  it("projects current corrected balances and separates hold activity", () => {
    const monday = projectAccountStatement(entries, { statementDate: "2026-08-24" });
    expect(monday.holdRows.map((row) => row.entryType)).toEqual(["CARD_AUTHORIZATION_HOLD"]);
    expect(monday.closingAvailableBalanceCents).toBe(95_000);
    expect(monday.closingHoldsCents).toBe(5_000);

    const current = projectAccountStatement(entries, { statementDate: "2026-08-25" });
    expect(current.openingLedgerBalanceCents).toBe(100_000);
    expect(current.openingAvailableBalanceCents).toBe(95_000);
    expect(current.openingHoldsCents).toBe(5_000);
    expect(current.closingLedgerBalanceCents).toBe(100_000);
    expect(current.closingAvailableBalanceCents).toBe(100_000);
    expect(current.closingHoldsCents).toBe(0);
    expect(current.postedRows.map((row) => row.entryType)).toEqual(["CARD_CLEARING", "CARD_SETTLEMENT_REVERSAL"]);
    expect(current.holdRows).toEqual([]);
    expect(current.postedRows.at(-1)?.runningAvailableBalanceCents).toBe(100_000);
    expect(current.postedRows[0].postedAmountCents).toBe(-7_340);
    expect(current.postedRows[0].holdImpactCents).toBe(-5_000);
  });

  it("reconstructs the known-at view and deterministic ordering", () => {
    const known = projectAccountStatement(entries, { statementDate: "2026-08-25", asOfBookingTimestamp: "2026-08-26T23:59:59Z" });
    expect(known.postedRows.map((row) => row.entryType)).toEqual(["CARD_CLEARING"]);
    expect(known.closingAvailableBalanceCents).toBe(92_660);
    expect(known.closingHoldsCents).toBe(0);
    expect(known.postedRows[0].runningAvailableBalanceCents).toBe(92_660);
  });

  it("carries balances through an empty day", () => {
    const empty = projectAccountStatement(entries, { statementDate: "2026-08-26" });
    expect(empty.postedRows).toEqual([]);
    expect(empty.holdRows).toEqual([]);
    expect(empty.openingAvailableBalanceCents).toBe(100_000);
    expect(empty.closingLedgerBalanceCents).toBe(100_000);
  });

  it("projects an inclusive multi-day range with boundary balances", () => {
    const range = projectAccountStatement(entries, { statementDate: "2026-08-24", statementEndDate: "2026-08-25" });
    expect(range.openingAvailableBalanceCents).toBe(100_000);
    expect(range.postedRows.map((row) => row.entryType)).toEqual(["CARD_CLEARING", "CARD_SETTLEMENT_REVERSAL"]);
    expect(range.holdRows.map((row) => row.entryType)).toEqual(["CARD_AUTHORIZATION_HOLD"]);
    expect(range.closingAvailableBalanceCents).toBe(100_000);
    expect(range.closingLedgerBalanceCents).toBe(100_000);
  });
});
