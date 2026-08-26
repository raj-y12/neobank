import { describe, expect, it } from "vitest";
import { maskAchAccountNumber, validateAchBankDetails } from "./ach";

describe("ACH bank details", () => {
  it("accepts Send Money account and routing number rules", () => {
    expect(() => validateAchBankDetails("1234", "101050001")).not.toThrow();
    expect(() => validateAchBankDetails("12345678901234567", "101050001")).not.toThrow();
  });

  it("rejects invalid account or routing numbers", () => {
    expect(() => validateAchBankDetails("123", "101050001")).toThrow("Account number must contain 4 to 17 digits");
    expect(() => validateAchBankDetails("1234", "10105000")).toThrow("Routing number must contain 9 digits");
  });

  it("masks the account number for display", () => {
    expect(maskAchAccountNumber("123456789")).toBe("••••6789");
  });
});
