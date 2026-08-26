import { describe, expect, it, vi } from "vitest";

vi.mock("@/src/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({
    auth: { signOut: async () => ({ error: null }) },
  }),
}));

import { POST } from "./route";

describe("POST /auth/signout", () => {
  it("redirects the completed form submission to login with GET semantics", async () => {
    const response = await POST(new Request("https://bank.example/auth/signout", { method: "POST" }));

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://bank.example/login");
  });
});
