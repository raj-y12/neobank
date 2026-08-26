import { describe, expect, it } from "vitest";
import { getBearerToken } from "./public-api-auth";

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
});
