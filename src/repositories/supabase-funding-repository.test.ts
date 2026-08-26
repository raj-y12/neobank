import { describe, expect, it, vi } from "vitest";
import type { FundingTransfer } from "../domain/payment-lifecycle";
import { SupabaseFundingRepository } from "./supabase-funding-repository";

function funding(id = "funding-a"): FundingTransfer {
  return { id, businessId: "business-a", accountId: "account-a", linkedFundingAccountId: "linked-a", amountCents: 100, rail: "ACH", status: "PENDING" };
}

function clientFor(existing: unknown) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
    insert: vi.fn(),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.maybeSingle.mockResolvedValue({ data: existing, error: null });
  query.insert.mockResolvedValue({ error: null });
  return { client: { from: () => query } as never, query };
}

describe("SupabaseFundingRepository", () => {
  it("returns the original funding record on an idempotent replay", async () => {
    const existing = { ...funding("funding-original"), providerTransferId: "sandbox-transfer-original" };
    const { client, query } = clientFor({ id: existing.id, business_id: existing.businessId, account_id: existing.accountId, linked_funding_account_id: existing.linkedFundingAccountId, amount_cents: existing.amountCents, rail: existing.rail, status: existing.status, provider_transfer_id: existing.providerTransferId });
    const result = await new SupabaseFundingRepository(client).create(funding("funding-retry"), "sandbox-transfer-retry", "funding-key");

    expect(result).toEqual(existing);
    expect(query.insert).not.toHaveBeenCalled();
  });

  it("rejects an idempotency key reused with a different funding request", async () => {
    const { client } = clientFor({ id: "funding-original", business_id: "business-a", account_id: "account-a", linked_funding_account_id: "linked-a", amount_cents: 200, rail: "ACH", status: "PENDING", provider_transfer_id: "sandbox-transfer-original" });

    await expect(new SupabaseFundingRepository(client).create(funding(), "sandbox-transfer-retry", "funding-key")).rejects.toThrow("Idempotency key was already used with different request data");
  });

  it("does not return an unpersisted transfer after a duplicate insert", async () => {
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn(),
      insert: vi.fn(),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.maybeSingle.mockResolvedValue({ data: null, error: null });
    query.insert.mockResolvedValue({ error: { code: "23505", message: "duplicate key" } });

    await expect(new SupabaseFundingRepository({ from: () => query } as never).create(funding(), "sandbox-transfer-retry", "funding-key"))
      .rejects.toThrow("Idempotency key was already used with different request data");
  });
});
