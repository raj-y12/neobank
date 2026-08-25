type LithicMoney = { amount?: number | null };

type LithicEvent = {
  type?: string;
  created?: string;
  amounts?: { cardholder?: LithicMoney | null; hold?: LithicMoney | null; settlement?: LithicMoney | null };
};

type LithicPayload = {
  token: string;
  card_token: string;
  status: string;
  authorization_amount?: number | null;
  settled_amount?: number | null;
  events?: LithicEvent[];
};

export type InternalTransactionProjection = {
  transaction: {
    provider: "lithic";
    providerTransactionId: string;
    cardToken: string;
    status: string;
    authorizationAmountCents: number | null;
    settledAmountCents: number | null;
  };
  event: {
    providerEventId: string;
    eventType: string;
    occurredAt: string | null;
    holdAmountCents: number | null;
    settlementAmountCents: number | null;
  };
  hold: { amountCents: number; status: "ACTIVE" | "RELEASED" } | null;
};

export function projectLithicTransaction({ providerEventId, payload }: { providerEventId: string; payload: LithicPayload }): InternalTransactionProjection {
  const events = [...(payload.events ?? [])].sort((a, b) => new Date(b.created ?? 0).getTime() - new Date(a.created ?? 0).getTime());
  const latest = events[0];
  const authorization = events.find((event) => event.type === "AUTHORIZATION");
  const authorizationAmountCents = payload.authorization_amount ?? authorization?.amounts?.cardholder?.amount ?? null;
  const holdAmountCents = authorization?.amounts?.hold?.amount ?? null;
  const settlementAmountCents = payload.settled_amount && payload.settled_amount !== 0
    ? Math.abs(payload.settled_amount)
    : latest?.amounts?.settlement?.amount ?? null;
  const holdReleased = payload.status === "SETTLED" || latest?.type === "REVERSAL" || latest?.type === "AUTHORIZATION_REVERSAL";

  return {
    transaction: {
      provider: "lithic",
      providerTransactionId: payload.token,
      cardToken: payload.card_token,
      status: payload.status,
      authorizationAmountCents,
      settledAmountCents: settlementAmountCents,
    },
    event: {
      providerEventId,
      eventType: latest?.type ?? "UNKNOWN",
      occurredAt: latest?.created ?? null,
      holdAmountCents,
      settlementAmountCents,
    },
    hold: holdAmountCents === null || holdAmountCents === 0
      ? null
      : { amountCents: holdAmountCents, status: holdReleased ? "RELEASED" : "ACTIVE" },
  };
}
