import { describe, expect, it, vi } from "vitest";

vi.mock("@/src/lib/auth-scope", () => ({
  getAuthenticatedScope: async () => ({ userId: "user-a", memberId: "member-a", businessId: "business-a", accountId: "account-a", role: "ADMIN", email: "admin@example.com" }),
}));

const query = vi.hoisted(() => {
  const value = {} as {
    update: () => typeof value;
    eq: () => typeof value;
    select: () => typeof value;
    maybeSingle: () => Promise<{ data: null; error: null }>;
  };
  value.update = () => value;
  value.eq = () => value;
  value.select = () => value;
  value.maybeSingle = async () => ({ data: null, error: null });
  return value;
});

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ from: () => query }),
}));

import { PATCH } from "./route";

describe("PATCH /api/reconciliation/{id}", () => {
  it("returns not found when the break is outside the business scope", async () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
    const response = await PATCH(new Request("https://example.test/api/reconciliation/break-missing", { method: "PATCH", body: "{}" }), { params: Promise.resolve({ id: "break-missing" }) });

    const body = await response.json();
    expect(response.status).toBe(404);
    expect(body).toEqual({ error: "Reconciliation break not found" });
  });
});
