import type { CardReversalIntent } from "@/src/domain/card-reversal";

export interface CardReversalRepository {
  createIntent(input: { originalTransactionId: string; idempotencyKey: string }): Promise<CardReversalIntent>;
  linkReturn(input: { intentId: string; providerReturnTransactionId: string; returnCardToken: string; returnAmountCents: number }): Promise<CardReversalIntent>;
  findByProviderReturnTransactionId(providerReturnTransactionId: string): Promise<CardReversalIntent | null>;
  markPosted(intentId: string): Promise<void>;
}
