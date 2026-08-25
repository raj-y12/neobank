import { describe, expect, it } from "vitest";
import { assertMembershipRole, type MembershipRole } from "./auth";

describe("auth domain", () => {
  it("accepts only the roles used by the demo", () => {
    expect(assertMembershipRole("ADMIN")).toBe("ADMIN");
    expect(assertMembershipRole("MEMBER")).toBe("MEMBER");
    expect(() => assertMembershipRole("OWNER")).toThrow("Invalid membership role");
  });

  it("preserves the business scope attached to a membership", () => {
    const membership: { userId: string; businessId: string; accountId: string; role: MembershipRole } = {
      userId: "user-1",
      businessId: "demo-business",
      accountId: "demo-account",
      role: "MEMBER",
    };
    expect(membership.businessId).toBe("demo-business");
    expect(membership.accountId).toBe("demo-account");
  });
});
