import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyPersonaSignature } from "./webhook-verification";

describe("Persona webhook signatures", () => {
  it("accepts the documented timestamp/body HMAC", () => {
    const body = JSON.stringify({ data: { id: "evt_1" } });
    const timestamp = "1700000000";
    const secret = "wbhsec_test";
    const signature = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
    expect(verifyPersonaSignature(body, `t=${timestamp},v1=${signature}`, secret)).toBe(true);
  });

  it("rejects a changed body", () => {
    expect(verifyPersonaSignature("{}", "t=1700000000,v1=invalid", "secret")).toBe(false);
  });
});
