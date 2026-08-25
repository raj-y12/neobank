const PLAID_BASE_URLS: Record<string, string> = {
  sandbox: "https://sandbox.plaid.com",
  development: "https://development.plaid.com",
  production: "https://production.plaid.com",
};

type PlaidResponse = { request_id?: string; link_token?: string; access_token?: string; item_id?: string; item?: { institution_id?: string | null; institution_name?: string | null } };

function plaidBaseUrl() {
  return PLAID_BASE_URLS[process.env.PLAID_ENV ?? "sandbox"] ?? PLAID_BASE_URLS.sandbox;
}

async function plaidFetch<T extends PlaidResponse>(path: string, body: Record<string, unknown>): Promise<T> {
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
