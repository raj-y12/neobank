import { authorizeHold, clearCardSettlement, releaseAuthorizationHold, type JournalEntry } from "./ledger";

type LithicMoney = { amount?: number | null };
export type LithicLifecycleEvent = {
  token?: string;
  type?: string;
  result?: string;
  created?: string;
  amounts?: { cardholder?: LithicMoney | null; settlement?: LithicMoney | null };
};
export type LithicTransactionPayload = {
  token: string;
  card_token: string;
  status: string;
  authorization_amount?: number | null;
  settled_amount?: number | null;
  amounts?: { hold?: LithicMoney | null; settlement?: LithicMoney | null };
  events?: LithicLifecycleEvent[];
};
export type LithicSnapshot = { webhookId: string; receivedAt: string; payload: LithicTransactionPayload };

export type PlannedLithicEvent = {
  semanticEventId: string;
  sourceWebhookId: string;
  transactionId: string;
  cardToken: string;
  type: string;
  occurredAt: string;
  learnedAt: string;
  disposition: "READY" | "PARKED" | "AMBIGUOUS" | "IGNORED";
  forcePost: boolean;
  settlementDeltaCents: number;
  holdIncreaseCents: number;
  holdReleaseCents: number;
  remainingHoldCents: number;
  cumulativeSettledCents: number;
  transactionStatus: string;
  providerPayload: LithicTransactionPayload;
};

export type PlannedLithicCommand = {
  semanticEventId: string;
  learnedAt: string;
  entry: JournalEntry;
  idempotencyKey: string;
};

type EventOccurrence = {
  identity: string;
  event: LithicLifecycleEvent;
  firstSnapshot: LithicSnapshot;
  stateSnapshot?: LithicSnapshot;
  missingToken: boolean;
};

const FORCE_POST_GRACE_MS = 15 * 60 * 1000;
const AUTH_TYPES = new Set(["AUTHORIZATION", "AUTHORIZATION_ADVICE"]);
const RELEASE_TYPES = new Set(["AUTHORIZATION_REVERSAL", "AUTHORIZATION_EXPIRY"]);

function cents(value: number | null | undefined) {
  return value === null || value === undefined ? null : Math.abs(value);
}

function semanticIdentity(transactionId: string, event: LithicLifecycleEvent) {
  if (event.token) return event.token;
  return null;
}

function latestEvent(snapshot: LithicSnapshot) {
  return [...(snapshot.payload.events ?? [])].sort((a, b) => Date.parse(b.created ?? "1970-01-01") - Date.parse(a.created ?? "1970-01-01"))[0];
}

function collectOccurrences(snapshots: LithicSnapshot[]) {
  const occurrences = new Map<string, EventOccurrence>();
  for (const snapshot of [...snapshots].sort((a, b) => a.receivedAt.localeCompare(b.receivedAt))) {
    const latest = latestEvent(snapshot);
    for (const [index, event] of (snapshot.payload.events ?? []).entries()) {
      const semanticId = semanticIdentity(snapshot.payload.token, event);
      const identity = semanticId ?? `missing-token:${snapshot.webhookId}:${index}`;
      const existing = occurrences.get(identity);
      if (!existing) occurrences.set(identity, { identity, event, firstSnapshot: snapshot, missingToken: semanticId === null });
      if (event === latest && !occurrences.get(identity)?.stateSnapshot) occurrences.get(identity)!.stateSnapshot = snapshot;
    }
  }
  return [...occurrences.values()].sort((a, b) =>
    (a.event.created ?? "").localeCompare(b.event.created ?? "") || a.identity.localeCompare(b.identity),
  );
}

export function planLithicLifecycle(snapshots: LithicSnapshot[], options: {
  now: string;
  forcePostGraceMs?: number;
  initialState?: { remainingHoldCents: number; cumulativeSettledSigned: number; hasAuthorization: boolean };
  excludedSemanticEventIds?: Set<string>;
}) {
  const occurrences = collectOccurrences(snapshots).filter((occurrence) => !options.excludedSemanticEventIds?.has(occurrence.identity));
  const grace = options.forcePostGraceMs ?? FORCE_POST_GRACE_MS;
  const forcedClearingIds = new Set<string>();
  const lateAuthorizationIds = new Set<string>();
  const ambiguousClearingIds = new Set<string>();
  const zeroClearingsByDelivery = new Map<string, EventOccurrence[]>();
  for (const occurrence of occurrences.filter((candidate) => candidate.event.type === "CLEARING" && !candidate.event.amounts?.settlement?.amount)) {
    const group = zeroClearingsByDelivery.get(occurrence.firstSnapshot.webhookId) ?? [];
    group.push(occurrence);
    zeroClearingsByDelivery.set(occurrence.firstSnapshot.webhookId, group);
  }
  for (const group of zeroClearingsByDelivery.values()) if (group.length > 1) for (const occurrence of group) ambiguousClearingIds.add(occurrence.identity);
  for (const clearing of occurrences.filter((occurrence) => occurrence.event.type === "CLEARING")) {
    const deadline = Date.parse(clearing.firstSnapshot.receivedAt) + grace;
    if (Date.parse(options.now) < deadline) continue;
    const authorizationCandidates = occurrences.filter((occurrence) =>
      AUTH_TYPES.has(occurrence.event.type ?? "")
      && (occurrence.event.created ?? "") <= (clearing.event.created ?? ""),
    );
    const hasTimelyAuthorization = authorizationCandidates.some((authorization) => Date.parse(authorization.firstSnapshot.receivedAt) <= deadline);
    if (!hasTimelyAuthorization) {
      forcedClearingIds.add(clearing.identity);
      for (const authorization of authorizationCandidates) lateAuthorizationIds.add(authorization.identity);
    }
  }
  const events: PlannedLithicEvent[] = [];
  const commands: PlannedLithicCommand[] = [];
  let remainingHoldCents = options.initialState?.remainingHoldCents ?? 0;
  let cumulativeSettledSigned = options.initialState?.cumulativeSettledSigned ?? 0;
  let hasAuthorization = options.initialState?.hasAuthorization ?? false;

  for (const occurrence of occurrences) {
    const event = occurrence.event;
    const type = event.type ?? "UNKNOWN";
    const occurredAt = event.created ?? occurrence.firstSnapshot.receivedAt;
    const approved = event.result === "APPROVED" && !lateAuthorizationIds.has(occurrence.identity);
    const state = occurrence.stateSnapshot?.payload;
    const previousHold = remainingHoldCents;
    let settlementDeltaCents = 0;
    let disposition: PlannedLithicEvent["disposition"] = occurrence.missingToken || ambiguousClearingIds.has(occurrence.identity)
      ? "AMBIGUOUS"
      : approved ? "READY" : "IGNORED";
    let forcePost = false;

    if (approved && disposition !== "AMBIGUOUS" && (type === "CLEARING" || type === "RETURN")) {
      const cumulative = state?.settled_amount;
      const eventSettlement = event.amounts?.settlement?.amount;
      settlementDeltaCents = eventSettlement ? Math.abs(eventSettlement) : cumulative !== null && cumulative !== undefined
        ? Math.abs(cumulative - cumulativeSettledSigned)
        : 0;
      if (cumulative !== null && cumulative !== undefined) cumulativeSettledSigned = cumulative;
      else cumulativeSettledSigned += type === "RETURN" ? settlementDeltaCents : -settlementDeltaCents;
    }

    if (approved && disposition !== "AMBIGUOUS" && AUTH_TYPES.has(type)) {
      const requestedHold = cents(state?.amounts?.hold?.amount)
        ?? cents(event.amounts?.cardholder?.amount)
        ?? cents(state?.authorization_amount)
        ?? previousHold;
      remainingHoldCents = requestedHold;
      hasAuthorization = true;
    } else if (approved && disposition !== "AMBIGUOUS" && type === "CLEARING") {
      if (!hasAuthorization || forcedClearingIds.has(occurrence.identity)) {
        const age = Date.parse(options.now) - Date.parse(occurrence.firstSnapshot.receivedAt);
        forcePost = age >= grace && forcedClearingIds.has(occurrence.identity);
        disposition = forcePost ? "READY" : "PARKED";
      }
      const providerRemaining = cents(state?.amounts?.hold?.amount);
      remainingHoldCents = providerRemaining ?? (state?.status === "SETTLED" ? 0 : Math.max(0, previousHold - settlementDeltaCents));
    } else if (approved && disposition !== "AMBIGUOUS" && RELEASE_TYPES.has(type)) {
      remainingHoldCents = cents(state?.amounts?.hold?.amount) ?? 0;
    }

    const planned: PlannedLithicEvent = {
      semanticEventId: occurrence.identity,
      sourceWebhookId: occurrence.firstSnapshot.webhookId,
      transactionId: occurrence.firstSnapshot.payload.token,
      cardToken: occurrence.firstSnapshot.payload.card_token,
      type,
      occurredAt,
      learnedAt: occurrence.firstSnapshot.receivedAt,
      disposition,
      forcePost,
      settlementDeltaCents,
      holdIncreaseCents: approved ? Math.max(0, remainingHoldCents - previousHold) : 0,
      holdReleaseCents: approved ? Math.max(0, previousHold - remainingHoldCents) : 0,
      remainingHoldCents,
      cumulativeSettledCents: Math.abs(cumulativeSettledSigned),
      transactionStatus: state?.status ?? occurrence.firstSnapshot.payload.status,
      providerPayload: state ?? occurrence.firstSnapshot.payload,
    };
    events.push(planned);
    if (planned.disposition !== "READY") continue;

    const valueDate = occurredAt.slice(0, 10);
    const referenceId = `${planned.transactionId}:${planned.semanticEventId}`;
    let entry: JournalEntry | null = null;
    let suffix = "";
    if (AUTH_TYPES.has(type) && planned.holdIncreaseCents > 0) {
      entry = { ...authorizeHold(planned.holdIncreaseCents, referenceId, valueDate), referenceId };
      suffix = "authorization";
    } else if ((AUTH_TYPES.has(type) || RELEASE_TYPES.has(type)) && planned.holdReleaseCents > 0) {
      entry = { ...releaseAuthorizationHold(planned.holdReleaseCents, referenceId, valueDate), referenceId };
      suffix = "authorization-reversal";
    } else if (type === "CLEARING" && planned.settlementDeltaCents > 0) {
      entry = { ...clearCardSettlement(planned.holdReleaseCents, planned.settlementDeltaCents, referenceId, valueDate), referenceId };
      suffix = "clearing";
    }
    if (entry) commands.push({ semanticEventId: planned.semanticEventId, learnedAt: planned.learnedAt, entry, idempotencyKey: `lithic:${planned.semanticEventId}:${suffix}` });
  }
  return { events, commands };
}
