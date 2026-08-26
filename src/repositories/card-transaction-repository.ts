import type { PlannedLithicEvent } from "@/src/domain/lithic-lifecycle";

export interface CardTransactionRepository {
  projectLifecycle(event: PlannedLithicEvent): Promise<void>;
  findProviderTransactionId(transactionId: string): Promise<string | null>;
  linkReversal(providerReturnTransactionId: string, originalTransactionId: string): Promise<void>;
  getLifecycleBaseline(providerTransactionId: string): Promise<{ remainingHoldCents: number; cumulativeSettledSigned: number; hasAuthorization: boolean }>;
}
