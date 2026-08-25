import { describe, expect, it } from "vitest";
import { assembleAuthenticatedScope } from "./auth-scope";

describe("assembleAuthenticatedScope", () => {
  it("binds the authenticated user to a payment member in the same business", () => {
    expect(assembleAuthenticatedScope({ sub: "user-1", email: "owner@example.com" }, {
      user_id: "user-1",
      business_id: "business-1",
      account_id: "account-1",
      role: "ADMIN",
    }, {
      id: "member-1",
      business_id: "business-1",
      auth_user_id: "user-1",
    })).toEqual({
      userId: "user-1",
      memberId: "member-1",
      businessId: "business-1",
      accountId: "account-1",
      role: "ADMIN",
      email: "owner@example.com",
    });
  });

  it("rejects a member row from another business", () => {
    expect(() => assembleAuthenticatedScope({ sub: "user-1" }, {
      user_id: "user-1",
      business_id: "business-1",
      account_id: "account-1",
      role: "MEMBER",
    }, {
      id: "member-2",
      business_id: "business-2",
      auth_user_id: "user-1",
    })).toThrow("No payment member is assigned");
  });
});
