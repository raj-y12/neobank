export type ProviderEventRecord = {
  provider: string;
  providerEventId: string;
  eventType: string;
  payload: unknown;
};

export type ProviderEventInsertResult = {
  inserted: boolean;
};

export interface ProviderEventRepository {
  insertIfNew(event: ProviderEventRecord): Promise<ProviderEventInsertResult>;
}
