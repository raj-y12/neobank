import { describe, expect, it } from "vitest";
import { collectStatementReferenceIds, resolveReversalReferenceId, statementReferenceFilters } from "./supabase-ledger-statement-repository";

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

describe("statementReferenceFilters", () => {
  it("includes immutable lifecycle-event references for a provider transaction", () => {
    expect(statementReferenceFilters(["tx_1"])).toContain("reference_id.like.tx_1:%");
    expect(statementReferenceFilters(["tx_1"])).toContain("reversal_of_reference_id.like.tx_1:%");
  });
});

describe("card statement scope", () => {
  it("requires authenticated scope for transaction detail", async () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
    const { getLedgerStatement } = await import("./supabase-ledger-statement-repository");
    await expect(getLedgerStatement("00000000-0000-4000-8000-000000000000")).rejects.toThrow("Authenticated scope is required");
  });

  it("rejects malformed transaction ids before querying Supabase", async () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
    const { getLedgerStatement } = await import("./supabase-ledger-statement-repository");
    await expect(getLedgerStatement("card-4821", undefined, { businessId: "b1", accountId: "a1" })).rejects.toThrow("Card statement not found");
  });
});
