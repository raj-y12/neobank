export type CardTransactionStatus = "PENDING" | "SETTLED" | "REVERSED";

export type CardAuthorizationResult = {
  accountId: string;
  transactionId: string;
  authorizationAmountCents: number;
  ledgerBalanceCents: number;
  activeHoldCents: number;
  availableBalanceCents: number;
  status: CardTransactionStatus;
};

export type CardSettlementResult = CardAuthorizationResult & {
  settlementAmountCents: number;
};

export type CardReversalResult = {
  reversalId: string;
  reversesTransactionId: string;
  reversalAmountCents: number;
  ledgerBalanceCents: number;
  availableBalanceCents: number;
  activeHoldCents: number;
  status: "REVERSED";
};

type CardAuthorizationInput = {
  accountId: string;
  transactionId: string;
  amountCents: number;
  ledgerBalanceCents: number;
};

export function authorizeCardTransaction({
  accountId,
  transactionId,
  amountCents,
  ledgerBalanceCents,
}: CardAuthorizationInput): CardAuthorizationResult {
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) {
    throw new Error("Card authorization amount must be a positive integer in cents");
  }

  if (!Number.isSafeInteger(ledgerBalanceCents) || ledgerBalanceCents < 0) {
    throw new Error("Ledger balance must be a non-negative integer in cents");
  }

  return {
    accountId,
    transactionId,
    authorizationAmountCents: amountCents,
    ledgerBalanceCents,
    activeHoldCents: amountCents,
    availableBalanceCents: ledgerBalanceCents - amountCents,
    status: "PENDING",
  };
}

export function clearCardTransaction(
  authorization: CardAuthorizationResult,
  settlementAmountCents: number,
): CardSettlementResult {
  if (!Number.isSafeInteger(settlementAmountCents) || settlementAmountCents <= 0) {
    throw new Error("Card settlement amount must be a positive integer in cents");
  }

  const ledgerBalanceCents =
    authorization.ledgerBalanceCents - settlementAmountCents;

  return {
    ...authorization,
    settlementAmountCents,
    ledgerBalanceCents,
    activeHoldCents: 0,
    availableBalanceCents: ledgerBalanceCents,
    status: "SETTLED",
  };
}

export function reverseCardSettlement(
  settlement: CardSettlementResult,
  reversalId: string,
): CardReversalResult {
  return {
    reversalId,
    reversesTransactionId: settlement.transactionId,
    reversalAmountCents: settlement.settlementAmountCents,
    ledgerBalanceCents:
      settlement.ledgerBalanceCents + settlement.settlementAmountCents,
    availableBalanceCents:
      settlement.availableBalanceCents + settlement.settlementAmountCents,
    activeHoldCents: 0,
    status: "REVERSED",
  };
}
