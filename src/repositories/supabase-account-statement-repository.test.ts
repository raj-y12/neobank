import { describe, expect, it } from "vitest";
import { mapPersistedJournalRow } from "./account-statement-repository";

describe("account statement repository mapping", () => {
  it("maps persisted booking and posting fields without environment scope", () => {
    const mapped = mapPersistedJournalRow({
      id: "entry-1",
      entry_type: "FUNDING_SETTLEMENT",
      value_date: "2026-08-25",
      created_at: "2026-08-25T10:00:00Z",
      booking_date: "2026-08-25",
      reference_id: "funding-1",
      reversal_of_reference_id: null,
      journal_postings: [{ account_code: "CUSTOMER_AVAILABLE", debit_cents: 0, credit_cents: 1000 }],
    });
    expect(mapped).toMatchObject({ id: "entry-1", bookingTimestamp: "2026-08-25T10:00:00Z", bookingDate: "2026-08-25" });
    expect(mapped.postings[0]).toEqual({ accountCode: "CUSTOMER_AVAILABLE", debitCents: 0, creditCents: 1000 });
    expect(mapped).not.toHaveProperty("businessId");
  });
});
