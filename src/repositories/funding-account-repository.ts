export type LinkedFundingAccount = {
  id: string;
  businessId: string;
  accountId: string;
  provider: string;
  providerItemId: string;
  institutionId: string | null;
  institutionName: string | null;
  accountName: string | null;
  accountMask: string | null;
  status: "LINKED" | "ERROR" | "DISCONNECTED";
  createdAt: string;
  updatedAt: string;
};

export interface FundingAccountRepository {
  get(businessId: string): Promise<LinkedFundingAccount | null>;
  save(input: {
    businessId: string;
    accountId: string;
    providerItemId: string;
    providerAccessToken: string;
    institutionId?: string | null;
    institutionName?: string | null;
    accountName?: string | null;
    accountMask?: string | null;
    accountNumber?: string | null;
    routingNumber?: string | null;
  }): Promise<LinkedFundingAccount>;
}
