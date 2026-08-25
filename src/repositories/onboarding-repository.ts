import type { OnboardingStatus, VerificationStatus } from "../domain/onboarding";

export type OnboardingRecord = OnboardingStatus & {
  id: string;
  businessId: string;
  accountId: string;
  businessName: string;
  ownerName: string;
  ownerEmail: string;
  businessInquiryId: string | null;
  ownerInquiryId: string | null;
  createdAt: string;
  updatedAt: string;
};

export interface OnboardingRepository {
  get(businessId: string): Promise<OnboardingRecord | null>;
  start(input: {
    businessId: string;
    accountId: string;
    businessName: string;
    ownerName: string;
    ownerEmail: string;
    businessInquiryId: string;
    ownerInquiryId: string;
  }): Promise<OnboardingRecord>;
  updateInquiryStatus(inquiryId: string, status: VerificationStatus): Promise<OnboardingRecord | null>;
}
