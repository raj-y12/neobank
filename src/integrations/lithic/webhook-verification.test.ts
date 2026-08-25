import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyLithicWebhook } from "./webhook-verification";

const secret = "test-webhook-secret";
const body = JSON.stringify({ event_type: "card_transaction.updated", token: "evt_123" });

function sign(webhookId: string, timestamp: number, payload: string) {
  const digest = createHmac("sha256", secret)
    .update(`${webhookId}.${timestamp}.${payload}`)
    .digest("base64");

  return `v1,${digest}`;
}

describe("Lithic webhook verification", () => {
  it("accepts a valid current signature and returns the parsed event", () => {
    const webhookId = "wh_123";
    const timestamp = Math.floor(Date.now() / 1000);

    const event = verifyLithicWebhook({
      body,
      headers: {
        "webhook-id": webhookId,
        "webhook-timestamp": String(timestamp),
        "webhook-signature": sign(webhookId, timestamp, body),
      },
      secret,
    });

    expect(event).toEqual({ event_type: "card_transaction.updated", token: "evt_123" });
  });

  it("rejects an invalid signature", () => {
    const timestamp = Math.floor(Date.now() / 1000);

    expect(() =>
      verifyLithicWebhook({
        body,
        headers: {
          "webhook-id": "wh_123",
          "webhook-timestamp": String(timestamp),
          "webhook-signature": "v1,not-a-real-signature",
        },
        secret,
      }),
    ).toThrow("Invalid Lithic webhook signature");
  });

  it("rejects a signature outside the replay window", () => {
    const timestamp = Math.floor(Date.now() / 1000) - 301;

    expect(() =>
      verifyLithicWebhook({
        body,
        headers: {
          "webhook-id": "wh_123",
          "webhook-timestamp": String(timestamp),
          "webhook-signature": sign("wh_123", timestamp, body),
        },
        secret,
      }),
    ).toThrow("Lithic webhook timestamp outside tolerance");
  });
});
