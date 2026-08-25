import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { reverseCardSettlement } from "../domain/ledger";
import { SupabaseLedgerRepository } from "./supabase-ledger-repository";

describe("SupabaseLedgerRepository", () => {
  it("uses one idempotent atomic command for replayed unmatched returns", async () => {
    const postedKeys = new Set<string>();
    let creditPostings = 0;
    const client = {
      rpc: async (_name: string, args: { p_idempotency_key: string; p_postings: Array<{ accountCode: string; creditCents: number }> }) => {
        if (!postedKeys.has(args.p_idempotency_key)) {
          postedKeys.add(args.p_idempotency_key);
          creditPostings += args.p_postings.filter((posting) => posting.accountCode === "CUSTOMER_AVAILABLE" && posting.creditCents > 0).length;
        }
        return { data: "journal_1", error: null };
      },
    } as unknown as SupabaseClient;

    const repository = new SupabaseLedgerRepository(client);
    const entry = reverseCardSettlement(7_340, "return_1", undefined, "2026-08-25");
    await repository.record(entry, "lithic:event_1:settlement-reversal");
    await repository.record(entry, "lithic:event_1:settlement-reversal");

    expect(creditPostings).toBe(1);
  });
});
