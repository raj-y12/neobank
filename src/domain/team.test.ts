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
    expect(validateEmployeeInvite({ firstName: "Employee", lastName: "User", email: "employee@example.com", role: "MEMBER", password: "employee123" })).toEqual({ firstName: "Employee", lastName: "User", email: "employee@example.com", role: "MEMBER", password: "employee123" });
    expect(() => validateEmployeeInvite({ firstName: "Employee", lastName: "User", email: "employee@example.com", role: "OWNER" })).toThrow("ADMIN or MEMBER");
  });

  it("requires an initial employee password for direct production provisioning", () => {
    expect(validateEmployeeInvite({ firstName: "Employee", lastName: "User", email: "employee@example.com", role: "MEMBER", password: "employee123" })).toEqual({ firstName: "Employee", lastName: "User", email: "employee@example.com", role: "MEMBER", password: "employee123" });
    expect(() => validateEmployeeInvite({ firstName: "Employee", lastName: "User", email: "employee@example.com", role: "MEMBER", password: "short" })).toThrow("Password");
  });

  it("requires and normalizes an employee first and last name", () => {
    expect(validateEmployeeInvite({ firstName: " Ada ", lastName: " Lovelace ", email: "ada@example.com", role: "MEMBER", password: "employee123" })).toEqual({ firstName: "Ada", lastName: "Lovelace", email: "ada@example.com", role: "MEMBER", password: "employee123" });
    expect(() => validateEmployeeInvite({ lastName: "Lovelace", email: "ada@example.com", role: "MEMBER", password: "employee123" })).toThrow("first name");
  });
});
