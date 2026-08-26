import { describe, expect, it } from "vitest";
import { getBearerToken, publicApiError } from "./public-api-auth";

describe("public API authentication", () => {
  it("extracts a bearer token case-insensitively", () => {
    const request = new Request("https://example.test/api/v1/account", {
      headers: { authorization: "bearer test-token" },
    });

    expect(getBearerToken(request)).toBe("test-token");
  });

  it("rejects malformed authorization headers", () => {
    const request = new Request("https://example.test/api/v1/account", {
      headers: { authorization: "Basic test-token" },
    });

    expect(getBearerToken(request)).toBeNull();
  });

  it("returns 409 for an idempotency payload conflict", async () => {
    const response = publicApiError(new Error("Idempotency key was already used with different request data"));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "Idempotency key was already used with different request data",
      code: "idempotency_conflict",
    });
  });
});
