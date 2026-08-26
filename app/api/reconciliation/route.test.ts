import { describe, expect, it, vi } from "vitest";

vi.mock("@/src/lib/auth-scope", () => ({
  getAuthenticatedScope: async () => ({ userId: "user-a", memberId: "member-a", businessId: "business-a", accountId: "account-a", role: "ADMIN", email: "admin@example.com" }),
}));

vi.mock("@/src/domain/reconciliation", () => ({
  diffReconciliation: () => [{ breakType: "IN_FILE_NOT_LEDGER", providerReference: "provider-a", actualAmountCents: 100 }],
  journalRowsForTransfers: () => [],
  parseReconciliationCsv: () => [],
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: (table: string) => {
      const query = {
        then: (resolve: (value: unknown) => unknown) => resolve({ data: table === "reconciliation_breaks" ? [] : [], error: null }),
        select: () => query,
        eq: () => query,
        maybeSingle: async () => ({ data: null, error: null }),
        insert: (value: unknown) => table === "reconciliation_files"
          ? query
          : Promise.resolve({ error: null }),
        single: async () => ({ data: { id: "file-a" }, error: null }),
      };
      return query;
    },
  }),
}));

import { POST } from "./route";

describe("POST /api/reconciliation", () => {
  it("accepts a normalized file when the reconciliation file is new", async () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

    const response = await POST(new Request("https://example.test/api/reconciliation", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fileReference: "file-a", providerRows: [{ referenceId: "provider-a", amountCents: 100 }] }),
    }));

    expect(response.status).toBe(201);
    expect((await response.json()).fileId).toBe("file-a");
  });
});
