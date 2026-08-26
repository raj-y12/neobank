import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const authState = vi.hoisted(() => ({
  claims: { sub: "user-without-membership" } as { sub: string } | null,
  error: false,
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: {
      getClaims: async () => {
        if (authState.error) throw new Error("refresh_token_not_found");
        return { data: { claims: authState.claims } };
      },
    },
  }),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null, error: null }),
        }),
      }),
    }),
  }),
}));

vi.mock("@/src/domain/navigation-gate", () => ({
  getRequiredRoute: () => null,
}));

import { updateSupabaseSession } from "./proxy";

describe("updateSupabaseSession", () => {
  beforeEach(() => {
    authState.claims = { sub: "user-without-membership" };
    authState.error = false;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-publishable-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
  });

  it("redirects a protected page when the claimed user has no business membership", async () => {
    const response = await updateSupabaseSession(new NextRequest("https://bank.example/account"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://bank.example/login?next=%2Faccount");
  });

  it("keeps the login page public", async () => {
    const response = await updateSupabaseSession(new NextRequest("https://bank.example/login"));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("treats an invalid refresh token as signed out", async () => {
    authState.error = true;
    const response = await updateSupabaseSession(new NextRequest("https://bank.example/account"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://bank.example/login?next=%2Faccount");
  });

  it("leaves scheduler routes to their bearer-token guard", async () => {
    authState.claims = null;
    const response = await updateSupabaseSession(new NextRequest("https://bank.example/api/jobs/standing-orders"));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("leaves the MCP endpoint to its bearer-token guard", async () => {
    authState.claims = null;
    const response = await updateSupabaseSession(new NextRequest("https://bank.example/api/mcp"));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("leaves public API routes to their bearer-token guard", async () => {
    authState.claims = null;
    const response = await updateSupabaseSession(new NextRequest("https://bank.example/api/v1/account"));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("keeps Scalar API docs public", async () => {
    authState.claims = null;
    const response = await updateSupabaseSession(new NextRequest("https://bank.example/docs"));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });
});
