import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyPersonaSignature(rawBody: string, signatureHeader: string | null, secret: string) {
  if (!signatureHeader || !secret) return false;
  const firstPair = signatureHeader.split(" ")[0] ?? "";
  const timestamp = firstPair.match(/(?:^|,)t=([^,]+)/)?.[1];
  if (!timestamp) return false;
  const signatures = signatureHeader
    .split(" ")
    .map((pair) => pair.match(/(?:^|,)v1=([^,]+)/)?.[1])
    .filter((value): value is string => Boolean(value));
  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  return signatures.some((signature) => {
    const expectedBuffer = Buffer.from(expected);
    const receivedBuffer = Buffer.from(signature);
    return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
  });
}
