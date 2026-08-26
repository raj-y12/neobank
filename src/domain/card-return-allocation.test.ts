import { describe, expect, it } from "vitest";
import { allocateCardReturn, planCardReturnCommands } from "./card-return-allocation";
import { projectStatement } from "./ledger-statement";

describe("allocateCardReturn", () => {
  it("allocates a return deterministically across specific immutable captures", () => {
    expect(allocateCardReturn(4_000, [
      { clearingReferenceId: "tx_1:event_clear_1", valueDate: "2026-08-26", reversibleCents: 3_000 },
      { clearingReferenceId: "tx_1:event_clear_2", valueDate: "2026-08-27", reversibleCents: 2_000 },
    ])).toEqual([
      { clearingReferenceId: "tx_1:event_clear_1", valueDate: "2026-08-26", amountCents: 3_000 },
      { clearingReferenceId: "tx_1:event_clear_2", valueDate: "2026-08-27", amountCents: 1_000 },
    ]);
  });

  it("rejects a return larger than the unreversed captures", () => {
    expect(() => allocateCardReturn(5_001, [
      { clearingReferenceId: "tx_1:event_clear_1", valueDate: "2026-08-26", reversibleCents: 5_000 },
    ])).toThrow("Return exceeds reversible clearing amount");
  });

  it("creates one immutable correction per capture on each capture's value date", () => {
    const commands = planCardReturnCommands({ semanticEventId: "event_return_1", returnTransactionId: "return_tx_1", amountCents: 4_000, learnedAt: "2026-08-29T12:00:00Z" }, [
      { clearingReferenceId: "tx_1:event_clear_1", valueDate: "2026-08-26", reversibleCents: 3_000 },
      { clearingReferenceId: "tx_1:event_clear_2", valueDate: "2026-08-27", reversibleCents: 2_000 },
    ]);
    expect(commands.map((command) => ({ valueDate: command.entry.valueDate, reverses: command.entry.reversalOfReferenceId, key: command.idempotencyKey }))).toEqual([
      { valueDate: "2026-08-26", reverses: "tx_1:event_clear_1", key: "lithic:event_return_1:settlement-reversal:tx_1:event_clear_1" },
      { valueDate: "2026-08-27", reverses: "tx_1:event_clear_2", key: "lithic:event_return_1:settlement-reversal:tx_1:event_clear_2" },
    ]);
    expect(commands.every((command) => command.learnedAt === "2026-08-29T12:00:00Z")).toBe(true);
  });

  it("keeps a later-learned correction out of an earlier as-known statement", () => {
    const [correction] = planCardReturnCommands({ semanticEventId: "event_return_1", returnTransactionId: "return_tx_1", amountCents: 3_000, learnedAt: "2026-08-29T12:00:00Z" }, [
      { clearingReferenceId: "tx_1:event_clear_1", valueDate: "2026-08-26", reversibleCents: 3_000 },
    ]);
    const entries = [
      { id: "clearing", entryType: "CARD_CLEARING", valueDate: "2026-08-26", bookingTimestamp: "2026-08-26T12:00:00Z", referenceId: "tx_1:event_clear_1", reversalOfReferenceId: null, postings: [{ accountCode: "CUSTOMER_AVAILABLE", debitCents: 3_000, creditCents: 0 }, { accountCode: "CARD_SETTLEMENT_PAYABLE", debitCents: 0, creditCents: 3_000 }] },
      { id: "return", entryType: correction.entry.entryType, valueDate: correction.entry.valueDate, bookingTimestamp: correction.learnedAt, referenceId: correction.entry.referenceId ?? null, reversalOfReferenceId: correction.entry.reversalOfReferenceId ?? null, postings: correction.entry.postings },
    ];
    expect(projectStatement(entries, { asOfBookingTimestamp: "2026-08-28T23:59:59Z" }).map((row) => row.journalEntryId)).toEqual(["clearing"]);
    expect(projectStatement(entries).map((row) => row.journalEntryId)).toEqual(["clearing", "return"]);
  });
});
