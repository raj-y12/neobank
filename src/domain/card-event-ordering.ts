export type CardProviderEvent = {
  providerEventId: string;
  transactionId: string;
  eventType: string;
  occurredAt: string | null;
};

export function reconcileCardEvents(events: CardProviderEvent[]) {
  const ordered = [...events].sort((a, b) =>
    new Date(a.occurredAt ?? 0).getTime() - new Date(b.occurredAt ?? 0).getTime() ||
    a.providerEventId.localeCompare(b.providerEventId),
  );
  const hasAuthorization = ordered.some((event) => event.eventType === "AUTHORIZATION");
  const parked = ordered.filter((event) => event.eventType === "CLEARING" && !hasAuthorization);
  const ready = ordered.filter((event) => !parked.includes(event));
  return { ready, parked };
}
