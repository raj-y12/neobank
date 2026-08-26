import { describe, expect, it } from "vitest";
import { authBrandTitle } from "./auth-brand";

describe("authBrandTitle", () => {
  it("combines the product and business banking descriptor", () => {
    expect(authBrandTitle()).toBe("Corgi Business Banking");
  });
});
