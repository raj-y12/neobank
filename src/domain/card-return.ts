export function settlementReversalIdempotencyKey(providerEventId: string) {
  return `lithic:${providerEventId}:settlement-reversal`;
}
