import { describe, expect, it } from "vitest";
import { assertBusinessScope, contextFromHeaders, requireAdmin } from "./authorization";

describe("authorization", () => {
  it("requires explicit business and member context", () => {
    expect(() => contextFromHeaders(new Headers())).toThrow("Authenticated business context is required");
  });
  it("enforces role and business scope", () => {
    const context = contextFromHeaders(new Headers({ "x-business-id": "b1", "x-account-id": "a1", "x-member-id": "m1", "x-member-role": "MEMBER" }));
    expect(() => requireAdmin(context)).toThrow("ADMIN role required");
    expect(() => assertBusinessScope(context, "b2")).toThrow("outside");
  });
});
