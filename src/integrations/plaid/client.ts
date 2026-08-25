import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function key() {
  const secret = process.env.PLAID_TOKEN_ENCRYPTION_KEY;
  if (!secret) throw new Error("PLAID_TOKEN_ENCRYPTION_KEY is not configured");
  return createHash("sha256").update(secret).digest();
}

export function encryptPlaidAccessToken(token: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return `${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${ciphertext.toString("base64url")}`;
}

export function decryptPlaidAccessToken(value: string) {
  if (value.startsWith("SIMULATED:")) return Buffer.from(value.slice("SIMULATED:".length), "base64url").toString("utf8");
  const [ivEncoded, tagEncoded, ciphertextEncoded] = value.split(".");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(ivEncoded, "base64url"));
  decipher.setAuthTag(Buffer.from(tagEncoded, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextEncoded, "base64url")), decipher.final()]).toString("utf8");
}

export async function createPlaidLinkToken(businessId: string) {
  if (!process.env.PLAID_CLIENT_ID || !process.env.PLAID_SECRET) {
    return { mode: "SIMULATED" as const, linkToken: `link-sim-${businessId}` };
  }
  const response = await fetch("https://sandbox.plaid.com/link/token/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: process.env.PLAID_CLIENT_ID, secret: process.env.PLAID_SECRET, client_name: "Neobank", language: "en", country_codes: ["US"], user: { client_user_id: businessId }, products: ["auth"] }),
  });
  if (!response.ok) throw new Error(`Plaid link token failed with ${response.status}`);
  const body = await response.json() as { link_token: string };
  return { mode: "LIVE" as const, linkToken: body.link_token };
}

type PlaidAuthResponse = {
  accounts: Array<{ account_id: string; name?: string; mask?: string }>;
  numbers: { ach: Array<{ account_id: string; account: string; routing: string }> };
};

async function plaidPost<T>(path: string, body: Record<string, unknown>) {
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;
  if (!clientId || !secret) throw new Error("Plaid credentials are not configured");
  const base = process.env.PLAID_ENV === "production" ? "https://production.plaid.com" : "https://sandbox.plaid.com";
  const response = await fetch(`${base}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ client_id: clientId, secret, ...body }) });
  if (!response.ok) throw new Error(`Plaid request failed with ${response.status}`);
  return response.json() as Promise<T>;
}

export async function exchangePlaidPublicToken(publicToken: string) {
  return plaidPost<{ access_token: string; item_id: string }>("/item/public_token/exchange", { public_token: publicToken });
}

export async function getPlaidAchNumbers(accessToken: string) {
  const response = await plaidPost<PlaidAuthResponse>("/auth/get", { access_token: accessToken });
  const number = response.numbers.ach[0];
  if (!number) throw new Error("Plaid did not return an ACH account");
  const account = response.accounts.find((candidate) => candidate.account_id === number.account_id);
  return { accountNumber: number.account, routingNumber: number.routing, accountMask: account?.mask ?? "", accountName: account?.name ?? "Linked bank" };
}
