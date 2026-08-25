import type { JournalEntry } from "@/src/domain/ledger";

export interface LedgerRepository {
  record(entry: JournalEntry, idempotencyKey: string): Promise<void>;
}
