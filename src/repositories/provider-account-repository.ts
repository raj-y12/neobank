export type ProviderAccount = {
  id: string;
  businessId: string;
  accountId: string;
  provider: "INCREASE";
  providerAccountId: string;
  providerAccountNumberId: string | null;
  status: "ACTIVE" | "DISCONNECTED" | "ERROR";
};

export interface ProviderAccountRepository {
  getActiveIncrease(businessId: string, accountId: string): Promise<ProviderAccount | null>;
}
