import { describe, expect, it } from "vitest";
import { ageBucket, diffReconciliation } from "./reconciliation";

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
    expect(ageBucket("2026-08-24T00:00:00Z")).toBe("0-1d");
    expect(ageBucket("2026-08-20T00:00:00Z")).toBe("4-7d");
    expect(ageBucket("2026-08-10T00:00:00Z")).toBe("8d+");
  });
});
