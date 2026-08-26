import { describe, expect, it, vi } from "vitest";
import { SupabaseCardReversalRepository } from "./supabase-card-reversal-repository";

describe("SupabaseCardReversalRepository.createIntent", () => {
  it("rejects an idempotency key reused for another transaction", async () => {
    const originalQuery = {
      select: vi.fn(),
      eq: vi.fn(),
      single: vi.fn(),
    };
    originalQuery.select.mockReturnValue(originalQuery);
    originalQuery.eq.mockReturnValue(originalQuery);
    originalQuery.single.mockResolvedValue({ data: { card_token: "card-a", status: "SETTLED", settled_amount_cents: 5000 }, error: null });

    const intentQuery = {
      insert: vi.fn(),
      select: vi.fn(),
      eq: vi.fn(),
      single: vi.fn(),
    };
    intentQuery.insert.mockReturnValue(intentQuery);
    intentQuery.select.mockReturnValue(intentQuery);
    intentQuery.eq.mockReturnValue(intentQuery);
    intentQuery.single
      .mockResolvedValueOnce({ data: null, error: { code: "23505", message: "duplicate key" } })
      .mockResolvedValueOnce({ data: { id: "intent-1", original_transaction_id: "transaction-other", card_token: "card-b", expected_amount_cents: 5000, provider_return_transaction_id: null, status: "PENDING", idempotency_key: "same-key" }, error: null });

    const client = { from: vi.fn((table: string) => table === "card_transactions" ? originalQuery : intentQuery) } as never;

    await expect(new SupabaseCardReversalRepository(client).createIntent({ originalTransactionId: "transaction-a", idempotencyKey: "same-key" }))
      .rejects.toThrow("Idempotency key was already used with different request data");
  });
});
