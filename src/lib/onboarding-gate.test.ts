import { describe, expect, it, vi } from "vitest";
import { isBusinessApprovedForBusiness } from "./onboarding-gate";

const { getOnboarding } = vi.hoisted(() => ({ getOnboarding: vi.fn() }));

vi.mock("../repositories/supabase-onboarding-repository", () => ({
  createSupabaseOnboardingRepository: () => ({ get: getOnboarding }),
}));

describe("isBusinessApprovedForBusiness", () => {
  it("requires both business and owner verification to be approved", async () => {
    getOnboarding.mockResolvedValueOnce({ businessStatus: "APPROVED", ownerStatus: "PENDING" });
    await expect(isBusinessApprovedForBusiness("business-a")).resolves.toBe(false);

    getOnboarding.mockResolvedValueOnce({ businessStatus: "APPROVED", ownerStatus: "APPROVED" });
    await expect(isBusinessApprovedForBusiness("business-a")).resolves.toBe(true);
  });

  it("treats a missing onboarding record as unapproved", async () => {
    getOnboarding.mockResolvedValueOnce(null);
    await expect(isBusinessApprovedForBusiness("business-a")).resolves.toBe(false);
  });
});
