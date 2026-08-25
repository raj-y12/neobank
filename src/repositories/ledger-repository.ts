import type { JournalEntry } from "@/src/domain/ledger";
import type { LedgerBalances } from "@/src/domain/ledger-balance";

export interface LedgerRepository {
  record(entry: JournalEntry, idempotencyKey: string): Promise<void>;
  getBalances(): Promise<LedgerBalances>;
}
