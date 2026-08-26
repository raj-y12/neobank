import type { JournalEntry } from "../domain/ledger";
import type { LedgerBalances, LedgerScope } from "../domain/ledger-balance";
import type { ReversibleClearing } from "../domain/card-return-allocation";

export interface LedgerRepository {
  record(entry: JournalEntry, idempotencyKey: string, knowledgeTime?: string): Promise<void>;
  getBalances(scope?: LedgerScope): Promise<LedgerBalances>;
  getReversibleCardClearings(providerTransactionId: string, replayIdempotencyPrefix?: string): Promise<ReversibleClearing[]>;
  postCardReturnAtomically(input: { originalProviderTransactionId: string; returnEventId: string; returnTransactionId: string; amountCents: number; learnedAt: string }): Promise<number>;
}
