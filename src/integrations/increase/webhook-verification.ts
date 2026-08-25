import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyIncreaseWebhook(body: string, headers: { id?: string | null; timestamp?: string | null; signature?: string | null }) {
  const secret = process.env.INCREASE_WEBHOOK_SECRET;
  if (!secret || !headers.id || !headers.timestamp || !headers.signature) throw new Error("Missing Increase webhook configuration or signature");
  const timestamp = Number(headers.timestamp);
  if (!Number.isFinite(timestamp) || Math.abs(Date.now() / 1000 - timestamp) > 300) throw new Error("Increase webhook timestamp outside tolerance");
  const key = secret.startsWith("whsec_") ? Buffer.from(secret.slice(6), "base64") : Buffer.from(secret);
  const expected = `v1,${createHmac("sha256", key).update(`${headers.id}.${headers.timestamp}.${body}`).digest("base64")}`;
  const valid = headers.signature.split(" ").some((candidate) => {
    const expectedBuffer = Buffer.from(expected);
    const candidateBuffer = Buffer.from(candidate);
    return expectedBuffer.length === candidateBuffer.length && timingSafeEqual(expectedBuffer, candidateBuffer);
  });
  if (!valid) throw new Error("Invalid Increase webhook signature");
}
