import type { InternalTransactionProjection } from "@/src/domain/lithic-transaction-projection";

export interface CardTransactionRepository {
  project(projection: InternalTransactionProjection, payload: unknown): Promise<void>;
}
