export type ProviderEventRecord = {
  provider: string;
  providerEventId: string;
  eventType: string;
  payload: unknown;
};

export type ProviderEventInsertResult = {
  inserted: boolean;
};

export type StoredProviderEvent = ProviderEventRecord & {
  receivedAt: string;
};

export interface ProviderEventRepository {
  insertIfNew(event: ProviderEventRecord): Promise<ProviderEventInsertResult>;
  listForTransaction(provider: string, providerTransactionId: string): Promise<StoredProviderEvent[]>;
  park(event: ProviderEventRecord & { providerTransactionId: string }): Promise<void>;
  markMatched(provider: string, providerEventId: string): Promise<void>;
}
