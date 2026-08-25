import type { JournalEntry } from "../domain/ledger";
import type { LedgerBalances, LedgerScope } from "../domain/ledger-balance";

export interface LedgerRepository {
  record(entry: JournalEntry, idempotencyKey: string): Promise<void>;
  getBalances(scope?: LedgerScope): Promise<LedgerBalances>;
}
