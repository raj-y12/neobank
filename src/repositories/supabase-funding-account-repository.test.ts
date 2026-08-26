import { describe, expect, it, vi } from "vitest";
import { SupabaseFundingAccountRepository } from "./supabase-funding-account-repository";

describe("SupabaseFundingAccountRepository.save", () => {
  it("does not reassign a Plaid item already owned by another business", async () => {
    const lookup = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn(),
    };
    lookup.select.mockReturnValue(lookup);
    lookup.eq.mockReturnValue(lookup);
    lookup.maybeSingle.mockResolvedValue({ data: { business_id: "business-other" }, error: null });
    const from = vi.fn(() => lookup);
    const client = { from } as never;

    await expect(new SupabaseFundingAccountRepository(client).save({
      businessId: "business-a",
      accountId: "account-a",
      providerItemId: "item-shared",
      providerAccessToken: "access-token",
      accountNumber: "1234567890",
      routingNumber: "021000021",
      institutionId: "ins-1",
      institutionName: "Sandbox Bank",
    })).rejects.toThrow("already linked to another business");

    expect(from).toHaveBeenCalledTimes(1);
  });
});
