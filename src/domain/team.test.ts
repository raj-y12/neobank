import { describe, expect, it } from "vitest";
import { validateEmployeeInvite, validateSignupInput } from "./team";

describe("team input validation", () => {
  it("normalizes a valid business signup", () => {
    expect(validateSignupInput({ email: " Owner@Example.com ", password: "password123", legalName: "Northstar Labs" })).toEqual({
      email: "owner@example.com",
      password: "password123",
      legalName: "Northstar Labs",
    });
  });

  it("requires a safe password and business name", () => {
    expect(() => validateSignupInput({ email: "owner@example.com", password: "short", legalName: "N" })).toThrow("Password");
  });

  it("accepts only supported employee roles", () => {
    expect(validateEmployeeInvite({ email: "employee@example.com", role: "MEMBER", password: "employee123" })).toEqual({ email: "employee@example.com", role: "MEMBER", password: "employee123" });
    expect(() => validateEmployeeInvite({ email: "employee@example.com", role: "OWNER" })).toThrow("ADMIN or MEMBER");
  });

  it("requires an initial employee password for direct production provisioning", () => {
    expect(validateEmployeeInvite({ email: "employee@example.com", role: "MEMBER", password: "employee123" })).toEqual({ email: "employee@example.com", role: "MEMBER", password: "employee123" });
    expect(() => validateEmployeeInvite({ email: "employee@example.com", role: "MEMBER", password: "short" })).toThrow("Password");
  });
});
