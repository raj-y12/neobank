import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  repository: {
    memberBelongsToBusiness: vi.fn(async () => true),
    get: vi.fn(),
    getProviderTransferId: vi.fn(async () => "provider-transfer-1"),
    setProviderTransfer: vi.fn(),
    reserveFunds: vi.fn(),
    addApproval: vi.fn(),
    releaseFunds: vi.fn(),
    setStatus: vi.fn(),
  },
}));

vi.mock("@/src/lib/auth-scope", () => ({
  getAuthenticatedScope: async () => ({ businessId: "business-1", accountId: "account-1", memberId: "admin-1", role: "ADMIN", email: "admin@example.com" }),
}));
vi.mock("@/src/domain/payment-lifecycle", () => ({ approvePayment: vi.fn(), rejectPayment: vi.fn() }));
vi.mock("@/src/lib/onboarding-gate", () => ({ isBusinessApprovedForBusiness: async () => true }));
vi.mock("@/src/lib/identifiers", () => ({ isUuid: () => true }));
vi.mock("@/src/repositories/supabase-payment-repository", () => ({ createSupabasePaymentRepository: () => state.repository }));
vi.mock("@/src/repositories/supabase-provider-account-repository", () => ({ createSupabaseProviderAccountRepository: () => ({ getActiveIncrease: vi.fn() }) }));
vi.mock("@/src/integrations/simulated-ach", () => ({ getPaymentRail: () => ({ mode: "SIMULATED", createOutbound: vi.fn() }) }));

import { POST as approve } from "./approve/route";
import { POST as reject } from "./reject/route";

const submittedPayment = {
  id: "00000000-0000-4000-8000-000000000001",
  businessId: "business-1",
  accountId: "account-1",
  initiatorId: "member-1",
  amountCents: 100,
  currency: "USD" as const,
  rail: "ACH" as const,
  recipient: "Supplier",
  status: "SUBMITTED" as const,
};

describe("payment approval and rejection idempotency", () => {
  it("returns an existing submission when approval is replayed", async () => {
    state.repository.get.mockResolvedValue(submittedPayment);
    const response = await approve(new Request("https://bank.example"), { params: Promise.resolve({ id: submittedPayment.id }) });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ payment: submittedPayment, submitted: true, mode: "SIMULATED", providerTransferId: "provider-transfer-1" });
    expect(state.repository.reserveFunds).not.toHaveBeenCalled();
    expect(state.repository.addApproval).not.toHaveBeenCalled();
  });

  it("returns an existing rejection when rejection is replayed", async () => {
    const rejectedPayment = { ...submittedPayment, status: "REJECTED" as const };
    state.repository.get.mockResolvedValue(rejectedPayment);
    const response = await reject(new Request("https://bank.example"), { params: Promise.resolve({ id: rejectedPayment.id }) });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ payment: rejectedPayment });
    expect(state.repository.releaseFunds).not.toHaveBeenCalled();
    expect(state.repository.setStatus).not.toHaveBeenCalled();
  });
});
