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
    expect(validateEmployeeInvite({ email: "employee@example.com", role: "MEMBER" })).toEqual({ email: "employee@example.com", role: "MEMBER" });
    expect(() => validateEmployeeInvite({ email: "employee@example.com", role: "OWNER" })).toThrow("ADMIN or MEMBER");
  });
});
