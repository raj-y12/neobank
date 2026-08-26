import { describe, expect, it } from "vitest";
import { ageBucket, diffReconciliation, journalRowsForTransfers, parseReconciliationCsv } from "./reconciliation";

describe("reconciliation", () => {
  it("finds missing, extra, and amount-mismatched rows", () => {
    expect(diffReconciliation(
      [{ referenceId: "provider-only", amountCents: 500 }, { referenceId: "mismatch", amountCents: 900 }],
      [{ referenceId: "ledger-only", amountCents: 300 }, { referenceId: "mismatch", amountCents: 1_000 }],
    )).toEqual([
      { breakType: "IN_FILE_NOT_LEDGER", providerReference: "provider-only", actualAmountCents: 500 },
      { breakType: "AMOUNT_MISMATCH", providerReference: "mismatch", ledgerReference: "mismatch", expectedAmountCents: 1_000, actualAmountCents: 900 },
      { breakType: "IN_LEDGER_NOT_FILE", providerReference: "ledger-only", ledgerReference: "ledger-only", expectedAmountCents: 300 },
    ]);
  });

  it("assigns operational aging buckets", () => {
    const now = new Date("2026-08-25T00:00:00Z");
    expect(ageBucket("2026-08-24T00:00:00Z", now)).toBe("0-1d");
    expect(ageBucket("2026-08-20T00:00:00Z", now)).toBe("4-7d");
    expect(ageBucket("2026-08-10T00:00:00Z", now)).toBe("8d+");
  });

  it("uses the supplied current time rather than a deployment date", () => {
    expect(ageBucket("2026-09-01T00:00:00Z", new Date("2026-09-10T00:00:00Z"))).toBe("8d+");
  });

  it("parses a header-driven Increase reconciliation CSV", () => {
    expect(parseReconciliationCsv("provider_reference,amount_cents\nach_transfer_1,50000\nach_transfer_2,-1250\n")).toEqual([
      { referenceId: "ach_transfer_1", amountCents: 50000 },
      { referenceId: "ach_transfer_2", amountCents: -1250 },
    ]);
  });

  it("rejects missing or invalid reconciliation CSV columns", () => {
    expect(() => parseReconciliationCsv("reference,amount\ntransfer_1,5\n")).toThrow("provider_reference");
    expect(() => parseReconciliationCsv("provider_reference,amount_cents\ntransfer_1,nope\n")).toThrow("amount_cents");
  });

  it("projects settled transfer truth from journal postings", () => {
    expect(journalRowsForTransfers([
      { referenceId: "funding-1", entryType: "FUNDING_SETTLEMENT", postings: [{ accountCode: "CUSTOMER_AVAILABLE", debitCents: 0, creditCents: 500 }] },
      { referenceId: "payment-1", entryType: "PAYMENT_SETTLEMENT", postings: [{ accountCode: "SAFEGUARDED_CASH", debitCents: 0, creditCents: 300 }] },
    ])).toEqual([
      { referenceId: "funding-1", amountCents: 500 },
      { referenceId: "payment-1", amountCents: -300 },
    ]);
  });
});
