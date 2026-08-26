const LITHIC_BASE_URL = "https://sandbox.lithic.com/v1";

export type LithicCard = {
  token: string;
  last_four: string;
  state: string;
  type: string;
  spend_limit: number | null;
  spend_limit_duration: string | null;
  created: string;
  hostname: string | null;
  memo: string | null;
  cardholder_currency: string | null;
};

export type LithicTransaction = {
  token: string;
  card_token: string | null;
  status: string | null;
  result: string | null;
  amount: number | null;
  settled_amount: number | null;
  authorization_amount?: number | null;
  merchant_descriptor: string | null;
  merchant: { descriptor?: string | null } | null;
  created: string | null;
  updated: string | null;
  amounts?: {
    hold?: LithicMoney | null;
    settlement?: LithicMoney | null;
    cardholder?: LithicMoney | null;
  };
  events?: LithicTransactionEvent[];
};

export type LithicMoney = {
  amount: number;
  currency: string;
};

export type LithicTransactionEvent = {
  type: string;
  result?: string | null;
  created?: string | null;
  amount?: number | null;
  amounts?: {
    hold?: LithicMoney | null;
    settlement?: LithicMoney | null;
    cardholder?: LithicMoney | null;
  };
};

async function lithicFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const apiKey = process.env.LITHIC_API_KEY;
  if (!apiKey) throw new Error("LITHIC_API_KEY is not configured");
  const response = await fetch(`${LITHIC_BASE_URL}${path}`, {
    ...init,
    headers: { Authorization: apiKey, ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Lithic request failed with ${response.status}${detail ? `: ${detail}` : ""}`);
  }
  return response.json() as Promise<T>;
}

export async function listLithicCards() {
  const response = await lithicFetch<{ data: LithicCard[] }>("/cards");
  return response.data;
}

export async function getLithicCard(token: string) {
  return lithicFetch<LithicCard>(`/cards/${encodeURIComponent(token)}`);
}

export async function createLithicVirtualCard(input: { spendLimit: number; spendLimitDuration: string }) {
  return lithicFetch<LithicCard>("/cards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "VIRTUAL", state: "OPEN", memo: "Team card", spend_limit: input.spendLimit, spend_limit_duration: input.spendLimitDuration }),
  });
}

export async function listLithicTransactions(cardToken: string) {
  const response = await lithicFetch<{ data: LithicTransaction[] }>(
    `/transactions?card_token=${encodeURIComponent(cardToken)}`,
  );
  return response.data;
}

export function formatUsdCents(amount: number | null | undefined) {
  if (amount === null || amount === undefined) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount / 100);
}

export function getCardholderAmount(transaction: LithicTransaction) {
  const events = [...(transaction.events ?? [])].sort(
    (a, b) => new Date(b.created ?? 0).getTime() - new Date(a.created ?? 0).getTime(),
  );
  const authorizationEvent = events.find((event) => event.type === "AUTHORIZATION");
  const latestEvent = transaction.status === "PENDING" ? authorizationEvent : events[0];
  if ((transaction.status === "SETTLED" || latestEvent?.type === "RETURN") && transaction.settled_amount) {
    return Math.abs(transaction.settled_amount);
  }
  return (
    latestEvent?.amounts?.hold?.amount ??
    latestEvent?.amounts?.cardholder?.amount ??
    transaction.amounts?.settlement?.amount ??
    transaction.amounts?.cardholder?.amount ??
    transaction.amounts?.hold?.amount ??
    transaction.settled_amount ??
    transaction.amount
  );
}

export function formatLithicDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date(value));
}
