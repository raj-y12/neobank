import { createHmac, timingSafeEqual } from "node:crypto";

const TIMESTAMP_TOLERANCE_SECONDS = 5 * 60;

type WebhookHeaders = {
  "webhook-id"?: string;
  "webhook-timestamp"?: string;
  "webhook-signature"?: string;
};

type VerifyLithicWebhookInput = {
  body: string;
  headers: WebhookHeaders;
  secret: string;
};

function getSecretBytes(secret: string) {
  if (!secret.startsWith("whsec_")) {
    return Buffer.from(secret, "utf8");
  }

  return Buffer.from(secret.slice("whsec_".length), "base64");
}

export function verifyLithicWebhook({
  body,
  headers,
  secret,
}: VerifyLithicWebhookInput): unknown {
  const webhookId = headers["webhook-id"];
  const timestampHeader = headers["webhook-timestamp"];
  const signatureHeader = headers["webhook-signature"];

  if (!webhookId || !timestampHeader || !signatureHeader) {
    throw new Error("Missing Lithic webhook signature headers");
  }

  const timestamp = Number(timestampHeader);
  const now = Math.floor(Date.now() / 1000);

  if (!Number.isInteger(timestamp) || Math.abs(now - timestamp) > TIMESTAMP_TOLERANCE_SECONDS) {
    throw new Error("Lithic webhook timestamp outside tolerance");
  }

  const signedContent = `${webhookId}.${timestampHeader}.${body}`;
  const expected = createHmac("sha256", getSecretBytes(secret))
    .update(signedContent)
    .digest();

  const matches = signatureHeader.split(" ").some((versionedSignature) => {
    const [version, encodedSignature] = versionedSignature.split(",");
    if (version !== "v1" || !encodedSignature) {
      return false;
    }

    const received = Buffer.from(encodedSignature, "base64");
    return received.length === expected.length && timingSafeEqual(received, expected);
  });

  if (!matches) {
    throw new Error("Invalid Lithic webhook signature");
  }

  return JSON.parse(body);
}
