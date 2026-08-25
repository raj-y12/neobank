import { describe, expect, it } from "vitest";
import { collectStatementReferenceIds, resolveReversalReferenceId } from "./supabase-ledger-statement-repository";

describe("collectStatementReferenceIds", () => {
  it("includes both sides when the selected transaction is the reversal", () => {
    expect(collectStatementReferenceIds(
      { id: "return_internal", provider_transaction_id: "return_provider", reversal_of_transaction_id: "original_internal" },
      [{ id: "original_internal", provider_transaction_id: "original_provider", reversal_of_transaction_id: null }],
    )).toEqual(["return_internal", "return_provider", "original_internal", "original_provider"]);
  });

  it("includes linked reversals when the selected transaction is original", () => {
    expect(collectStatementReferenceIds(
      { id: "original_internal", provider_transaction_id: "original_provider", reversal_of_transaction_id: null },
      [{ id: "return_internal", provider_transaction_id: "return_provider", reversal_of_transaction_id: "original_internal" }],
    )).toEqual(["original_internal", "original_provider", "return_internal", "return_provider"]);
  });

  it("uses the linked transaction relationship when the immutable journal has no link", () => {
    expect(resolveReversalReferenceId(null, "return_provider", new Map([["return_provider", "original_internal"]]))).toBe("original_internal");
    expect(resolveReversalReferenceId("journal_original", "return_provider", new Map([["return_provider", "projection_original"]]))).toBe("journal_original");
  });
});
