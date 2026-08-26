import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createInbound: vi.fn(),
  getAchSource: vi.fn(),
}));

vi.mock("@/src/lib/auth-scope", () => ({
  getAuthenticatedScope: async () => ({ userId: "user-a", memberId: "member-a", businessId: "business-a", accountId: "account-a", role: "ADMIN", email: "admin@example.com" }),
}));
vi.mock("@/src/domain/payment-lifecycle", () => ({
  createFundingTransfer: (input: Record<string, unknown>) => ({ id: "funding-a", ...input, status: "PENDING" }),
}));
vi.mock("@/src/domain/onboarding", () => ({ isBusinessApproved: () => true }));
vi.mock("@/src/integrations/simulated-ach", () => ({
  getPaymentRail: () => ({ mode: "SIMULATED", createInbound: mocks.createInbound }),
}));
vi.mock("@/src/repositories/supabase-onboarding-repository", () => ({
  createSupabaseOnboardingRepository: () => ({ get: async () => ({ businessStatus: "APPROVED", ownerStatus: "APPROVED" }) }),
}));
vi.mock("@/src/repositories/supabase-funding-account-repository", () => ({
  createSupabaseFundingAccountRepository: () => ({
    get: async () => ({ id: "funding-account-a" }),
    getAchSource: mocks.getAchSource,
  }),
}));
vi.mock("@/src/repositories/supabase-provider-account-repository", () => ({
  createSupabaseProviderAccountRepository: () => ({ getActiveIncrease: async () => null }),
}));
vi.mock("@/src/repositories/supabase-funding-repository", () => ({
  createSupabaseFundingRepository: () => ({
    getByIdempotencyKey: async () => null,
    create: async (funding: { id: string }, providerTransferId: string) => ({ ...funding, providerTransferId }),
  }),
}));

import { POST } from "./route";

describe("POST /api/funding", () => {
  it("does not require decrypted ACH source details in simulated mode", async () => {
    mocks.createInbound.mockResolvedValue({ providerTransferId: "sim-in-funding-a", status: "PENDING" });
    mocks.getAchSource.mockRejectedValue(new Error("source details should not be read"));

    const response = await POST(new Request("https://example.test/api/funding", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ amountCents: 500, idempotencyKey: "funding-test-a" }),
    }));

    expect(response.status).toBe(201);
    expect((await response.json()).mode).toBe("SIMULATED");
    expect(mocks.getAchSource).not.toHaveBeenCalled();
    expect(mocks.createInbound).toHaveBeenCalledWith(expect.objectContaining({ amountCents: 500 }));
  });
});
