const PLAID_BASE_URLS: Record<string, string> = {
  sandbox: "https://sandbox.plaid.com",
  development: "https://development.plaid.com",
  production: "https://production.plaid.com",
};

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export function encryptSensitiveValue(value: string) {
  const secret = process.env.PLAID_TOKEN_ENCRYPTION_KEY;
  if (!secret) throw new Error("PLAID_TOKEN_ENCRYPTION_KEY is not configured");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", createHash("sha256").update(secret).digest(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${ciphertext.toString("base64url")}`;
}

export function decryptSensitiveValue(value: string) {
  const secret = process.env.PLAID_TOKEN_ENCRYPTION_KEY;
  if (!secret) throw new Error("PLAID_TOKEN_ENCRYPTION_KEY is not configured");
  const [ivEncoded, tagEncoded, ciphertextEncoded] = value.split(".");
  if (!ivEncoded || !tagEncoded || !ciphertextEncoded) throw new Error("Encrypted value is invalid");
  const decipher = createDecipheriv("aes-256-gcm", createHash("sha256").update(secret).digest(), Buffer.from(ivEncoded, "base64url"));
  decipher.setAuthTag(Buffer.from(tagEncoded, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextEncoded, "base64url")), decipher.final()]).toString("utf8");
}

function plaidBaseUrl() {
  return PLAID_BASE_URLS[process.env.PLAID_ENV ?? "sandbox"] ?? PLAID_BASE_URLS.sandbox;
}

async function plaidFetch<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;
  if (!clientId || !secret) throw new Error("PLAID_CLIENT_ID and PLAID_SECRET are required");
  const response = await fetch(`${plaidBaseUrl()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "PLAID-CLIENT-ID": clientId, "PLAID-SECRET": secret },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const result = await response.json() as T & { error_code?: string; display_message?: string; error_message?: string };
  if (!response.ok) throw new Error(`Plaid request failed with ${response.status}: ${result.display_message ?? result.error_message ?? result.error_code ?? "unknown error"}`);
  return result;
}

export async function createPlaidLinkToken(input: { businessId: string }) {
  return plaidFetch<{ link_token: string; expiration: string; request_id: string }>("/link/token/create", {
    client_name: "Corgi",
    language: "en",
    country_codes: ["US"],
    user: { client_user_id: input.businessId },
    products: ["auth"],
  });
}

export async function exchangePlaidPublicToken(publicToken: string) {
  return plaidFetch<{ access_token: string; item_id: string; request_id: string }>("/item/public_token/exchange", { public_token: publicToken });
}

export async function getPlaidItem(accessToken: string) {
  return plaidFetch<{ item: { item_id: string; institution_id?: string | null; institution_name?: string | null }; request_id: string }>("/item/get", { access_token: accessToken });
}

export function encryptPlaidAccessToken(value: string) {
  return encryptSensitiveValue(value);
}

export function decryptPlaidAccessToken(value: string) {
  if (value.startsWith("SIMULATED:")) return Buffer.from(value.slice("SIMULATED:".length), "base64url").toString("utf8");
  if (!value.includes(".")) return value;
  return decryptSensitiveValue(value);
}

export async function getPlaidAuthNumbers(accessToken: string) {
  const response = await plaidFetch<{ accounts: Array<{ account_id: string; name?: string; mask?: string }>; numbers: { ach: Array<{ account_id: string; account: string; routing: string }> } }>("/auth/get", { access_token: accessToken });
  const number = response.numbers.ach[0];
  if (!number) throw new Error("Plaid did not return an ACH account");
  const account = response.accounts.find((candidate) => candidate.account_id === number.account_id);
  return { accountNumber: number.account, routingNumber: number.routing, accountName: account?.name, accountMask: account?.mask };
}
