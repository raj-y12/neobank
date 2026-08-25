export type CardReversalIntent = {
  id: string;
  originalTransactionId: string;
  cardToken: string;
  expectedAmountCents: number;
  providerReturnTransactionId: string | null;
  status: "PENDING" | "LINKED" | "POSTED" | "REJECTED";
  idempotencyKey: string;
};

export function validateReturnLink(input: {
  intent: CardReversalIntent;
  returnCardToken: string;
  returnAmountCents: number;
}) {
  if (input.intent.status !== "PENDING") throw new Error("Reversal intent is not pending");
  if (input.intent.cardToken !== input.returnCardToken) throw new Error("Return card does not match reversal intent card");
  if (input.intent.expectedAmountCents !== input.returnAmountCents) throw new Error("Return amount does not match reversal intent amount");
}
