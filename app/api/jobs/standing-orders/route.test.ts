import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  approved: false,
  rpc: vi.fn(),
}));

const orderQuery = {
  select: () => orderQuery,
  eq: () => orderQuery,
  lte: async () => ({ data: [{ id: "order-1", business_id: "business-1", account_id: "account-1", amount_cents: 100, recipient: {}, insufficient_funds_policy: "SKIP", next_run_date: "2026-08-26", frequency: "DAILY" }], error: null }),
};

vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({ from: () => orderQuery, rpc: state.rpc }) }));
vi.mock("@/src/lib/onboarding-gate", () => ({ isBusinessApprovedForBusiness: vi.fn(async () => state.approved) }));
vi.mock("@/src/integrations/simulated-ach", () => ({ getPaymentRail: vi.fn() }));
vi.mock("@/src/domain/payment-lifecycle", () => ({ APPROVAL_THRESHOLD_CENTS: 100_000, standingOrderPaymentStatus: vi.fn() }));
vi.mock("@/src/domain/standing-orders", () => ({ standingOrderPaymentStatus: vi.fn(), nextStandingOrderDate: vi.fn() }));
vi.mock("@/src/integrations/plaid/client", () => ({ decryptSensitiveValue: vi.fn() }));

import { POST } from "./route";

describe("POST /api/jobs/standing-orders", () => {
  beforeEach(() => {
    state.approved = false;
    state.rpc.mockReset();
    process.env.CRON_SECRET = "test-cron-secret";
  });

  it("does not create an occurrence or payment for an unapproved business", async () => {
    const response = await POST(new Request("https://bank.example", { headers: { authorization: "Bearer test-cron-secret" } }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ processed: 1, results: [{ id: "order-1", status: "BUSINESS_NOT_APPROVED" }] });
    expect(state.rpc).not.toHaveBeenCalled();
  });
});
