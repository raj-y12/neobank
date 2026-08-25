export type VerificationStatus = "PENDING" | "APPROVED" | "REJECTED";

export type OnboardingStatus = {
  businessStatus: VerificationStatus;
  ownerStatus: VerificationStatus;
};

const rank: Record<VerificationStatus, number> = {
  PENDING: 1,
  REJECTED: 2,
  APPROVED: 3,
};

export function isBusinessApproved(status: OnboardingStatus | null | undefined) {
  return Boolean(status && status.businessStatus === "APPROVED" && status.ownerStatus === "APPROVED");
}

export function mergeVerificationStatus(
  current: VerificationStatus,
  incoming: VerificationStatus,
): VerificationStatus {
  return rank[incoming] >= rank[current] ? incoming : current;
}

export function applySingleInquiryStatus(current: OnboardingStatus, incoming: VerificationStatus): OnboardingStatus {
  return {
    businessStatus: mergeVerificationStatus(current.businessStatus, incoming),
    ownerStatus: mergeVerificationStatus(current.ownerStatus, incoming),
  };
}

export function normalizePersonaStatus(value: unknown): VerificationStatus | null {
  if (typeof value !== "string") return null;
  const normalized = value.toLowerCase();
  if (["approved", "passed"].includes(normalized)) return "APPROVED";
  if (["declined", "rejected", "failed"].includes(normalized)) return "REJECTED";
  if (["created", "started", "completed", "pending", "needs_review"].includes(normalized)) return "PENDING";
  return null;
}

export function requireApprovedBusiness(status: OnboardingStatus | null | undefined) {
  if (!isBusinessApproved(status)) {
    throw new Error("Business verification must be approved before this action");
  }
}
