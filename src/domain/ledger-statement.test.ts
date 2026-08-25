import { describe, expect, it } from "vitest";
import { projectStatement, type StatementJournalEntry } from "./ledger-statement";

describe("projectStatement", () => {
  it("keeps value date and booking timestamp separate", () => {
    const entries: StatementJournalEntry[] = [
      { id: "reversal", entryType: "CARD_SETTLEMENT_REVERSAL", valueDate: "2026-08-27", bookingTimestamp: "2026-08-29T12:00:00Z", referenceId: "return_1", reversalOfReferenceId: "tx_1", postings: [{ accountCode: "CARD_SETTLEMENT_PAYABLE", debitCents: 7_340, creditCents: 0 }, { accountCode: "CUSTOMER_AVAILABLE", debitCents: 0, creditCents: 7_340 }] },
      { id: "clearing", entryType: "CARD_CLEARING", valueDate: "2026-08-27", bookingTimestamp: "2026-08-27T12:00:00Z", referenceId: "tx_1", reversalOfReferenceId: null, postings: [{ accountCode: "CUSTOMER_CARD_HOLDS", debitCents: 5_000, creditCents: 0 }, { accountCode: "CUSTOMER_AVAILABLE", debitCents: 0, creditCents: 5_000 }, { accountCode: "CUSTOMER_AVAILABLE", debitCents: 7_340, creditCents: 0 }, { accountCode: "CARD_SETTLEMENT_PAYABLE", debitCents: 0, creditCents: 7_340 }] },
    ];

    expect(projectStatement(entries)).toEqual([
      expect.objectContaining({ journalEntryId: "clearing", valueDate: "2026-08-27", bookingTimestamp: "2026-08-27T12:00:00Z", amountCents: -7_340, availableBalanceImpactCents: -2_340 }),
      expect.objectContaining({ journalEntryId: "reversal", valueDate: "2026-08-27", bookingTimestamp: "2026-08-29T12:00:00Z", amountCents: 7_340, availableBalanceImpactCents: 7_340 }),
    ]);
  });

  it("keeps the original and reversal on the same corrected value date", () => {
    const entries: StatementJournalEntry[] = [
      { id: "reversal", entryType: "CARD_SETTLEMENT_REVERSAL", valueDate: "2026-08-27", bookingTimestamp: "2026-08-29T12:00:00Z", referenceId: "return_1", reversalOfReferenceId: "internal_tx_1", postings: [{ accountCode: "CARD_SETTLEMENT_PAYABLE", debitCents: 7_340, creditCents: 0 }, { accountCode: "CUSTOMER_AVAILABLE", debitCents: 0, creditCents: 7_340 }] },
      { id: "clearing", entryType: "CARD_CLEARING", valueDate: "2026-08-27", bookingTimestamp: "2026-08-27T12:00:00Z", referenceId: "lithic_tx_1", reversalOfReferenceId: null, postings: [{ accountCode: "CUSTOMER_CARD_HOLDS", debitCents: 5_000, creditCents: 0 }, { accountCode: "CUSTOMER_AVAILABLE", debitCents: 0, creditCents: 5_000 }, { accountCode: "CUSTOMER_AVAILABLE", debitCents: 7_340, creditCents: 0 }, { accountCode: "CARD_SETTLEMENT_PAYABLE", debitCents: 0, creditCents: 7_340 }] },
    ];

    expect(projectStatement(entries).map((row) => row.journalEntryId)).toEqual(["clearing", "reversal"]);
  });

  it("can reproduce what the ledger knew at a historical booking timestamp", () => {
    const entries: StatementJournalEntry[] = [
      { id: "reversal", entryType: "CARD_SETTLEMENT_REVERSAL", valueDate: "2026-08-27", bookingTimestamp: "2026-08-29T12:00:00Z", referenceId: "return_1", reversalOfReferenceId: "internal_tx_1", postings: [{ accountCode: "CARD_SETTLEMENT_PAYABLE", debitCents: 7_340, creditCents: 0 }, { accountCode: "CUSTOMER_AVAILABLE", debitCents: 0, creditCents: 7_340 }] },
      { id: "clearing", entryType: "CARD_CLEARING", valueDate: "2026-08-27", bookingTimestamp: "2026-08-27T12:00:00Z", referenceId: "lithic_tx_1", reversalOfReferenceId: null, postings: [{ accountCode: "CUSTOMER_CARD_HOLDS", debitCents: 5_000, creditCents: 0 }, { accountCode: "CUSTOMER_AVAILABLE", debitCents: 0, creditCents: 5_000 }, { accountCode: "CUSTOMER_AVAILABLE", debitCents: 7_340, creditCents: 0 }, { accountCode: "CARD_SETTLEMENT_PAYABLE", debitCents: 0, creditCents: 7_340 }] },
    ];

    expect(projectStatement(entries, { asOfBookingTimestamp: "2026-08-28T00:00:00Z" }).map((row) => row.journalEntryId)).toEqual(["clearing"]);
    expect(projectStatement(entries).map((row) => row.journalEntryId)).toEqual(["clearing", "reversal"]);
  });
});
