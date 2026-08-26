export type ReversibleClearing = {
  clearingReferenceId: string;
  valueDate: string;
  reversibleCents: number;
};

export function allocateCardReturn(amountCents: number, clearings: ReversibleClearing[]) {
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) throw new Error("Return amount must be positive cents");
  let remaining = amountCents;
  const allocations: Array<{ clearingReferenceId: string; valueDate: string; amountCents: number }> = [];
  for (const clearing of clearings) {
    if (remaining === 0) break;
    const amount = Math.min(remaining, clearing.reversibleCents);
    if (amount > 0) allocations.push({ clearingReferenceId: clearing.clearingReferenceId, valueDate: clearing.valueDate, amountCents: amount });
    remaining -= amount;
  }
  if (remaining > 0) throw new Error("Return exceeds reversible clearing amount");
  return allocations;
}

export function planCardReturnCommands(
  returned: { semanticEventId: string; returnTransactionId: string; amountCents: number; learnedAt: string },
  clearings: ReversibleClearing[],
) {
  return allocateCardReturn(returned.amountCents, clearings).map((allocation, index) => ({
    entry: reverseCardSettlement(
      allocation.amountCents,
      `${returned.returnTransactionId}:${returned.semanticEventId}:${index + 1}`,
      allocation.clearingReferenceId,
      allocation.valueDate,
    ),
    idempotencyKey: `lithic:${returned.semanticEventId}:settlement-reversal:${allocation.clearingReferenceId}`,
    learnedAt: returned.learnedAt,
  }));
}
import { reverseCardSettlement } from "./ledger";
