import { afterEach, describe, expect, it } from "vitest";
import { decryptSensitiveValue, encryptSensitiveValue } from "./client";

describe("sensitive value encryption", () => {
  const previousKey = process.env.PLAID_TOKEN_ENCRYPTION_KEY;

  afterEach(() => {
    if (previousKey === undefined) delete process.env.PLAID_TOKEN_ENCRYPTION_KEY;
    else process.env.PLAID_TOKEN_ENCRYPTION_KEY = previousKey;
  });

  it("round-trips a bank detail without storing plaintext", () => {
    process.env.PLAID_TOKEN_ENCRYPTION_KEY = "test-only-encryption-key";
    const encrypted = encryptSensitiveValue("123456789");
    expect(encrypted).not.toContain("123456789");
    expect(decryptSensitiveValue(encrypted)).toBe("123456789");
  });
});
