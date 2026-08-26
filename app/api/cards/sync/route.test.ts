import { describe, expect, it, vi } from "vitest";

vi.mock("@/src/lib/auth-scope", () => ({
  getAuthenticatedScope: async () => { throw new Error("ADMIN role required"); },
}));
vi.mock("@/src/integrations/lithic/client", () => ({ listLithicCards: vi.fn() }));
vi.mock("@/src/repositories/supabase-business-card-repository", () => ({ syncBusinessCards: vi.fn() }));

import { POST } from "./route";

describe("POST /api/cards/sync", () => {
  it("returns forbidden when a member tries to sync cards", async () => {
    const response = await POST();

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "ADMIN role required" });
  });
});
