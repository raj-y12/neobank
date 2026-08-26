export const APPROVAL_THRESHOLD_CENTS = 100_000;

export type PaymentStatus =
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "SUBMITTED"
  | "SETTLED"
  | "RETURNED";

export type FundingStatus = "PENDING" | "SETTLED" | "RETURNED";

export type Payment = {
  id: string;
  businessId: string;
  accountId: string;
  initiatorId: string;
  amountCents: number;
  currency: "USD";
  rail: "ACH";
  recipient: string;
  recipientBank?: { accountNumber: string; routingNumber: string };
  status: PaymentStatus;
};

type PaymentInput = Omit<Payment, "id" | "status"> & { approvalMode?: "THRESHOLD" | "HUMAN" };

export type FundingTransfer = {
  id: string;
  businessId: string;
  accountId: string;
  linkedFundingAccountId: string;
  amountCents: number;
  rail: "ACH";
  status: FundingStatus;
};

const paymentTransitions: Record<PaymentStatus, PaymentStatus[]> = {
  PENDING_APPROVAL: ["APPROVED", "REJECTED"],
  APPROVED: ["SUBMITTED", "REJECTED"],
  REJECTED: [],
  SUBMITTED: ["SETTLED", "RETURNED"],
  SETTLED: ["RETURNED"],
  RETURNED: [],
};

const fundingTransitions: Record<FundingStatus, FundingStatus[]> = {
  PENDING: ["SETTLED", "RETURNED"],
  SETTLED: ["RETURNED"],
  RETURNED: [],
};

export function canTransitionPayment(from: PaymentStatus, to: PaymentStatus) {
  return paymentTransitions[from].includes(to);
}

export function canTransitionFunding(from: FundingStatus, to: FundingStatus) {
  return fundingTransitions[from].includes(to);
}

export function createPayment(input: PaymentInput): Payment {
  if (!Number.isSafeInteger(input.amountCents) || input.amountCents <= 0) {
    throw new Error("Payment amount must be positive cents");
  }
  return {
    businessId: input.businessId,
    accountId: input.accountId,
    initiatorId: input.initiatorId,
    amountCents: input.amountCents,
    currency: input.currency,
    rail: input.rail,
    recipient: input.recipient,
    recipientBank: input.recipientBank,
    id: crypto.randomUUID(),
    status: input.approvalMode === "HUMAN" || input.amountCents > APPROVAL_THRESHOLD_CENTS ? "PENDING_APPROVAL" : "APPROVED",
  };
}

export function approvalRequirement(payment: Payment): "SECOND_HUMAN" | "DIRECT" {
  return payment.amountCents > APPROVAL_THRESHOLD_CENTS ? "SECOND_HUMAN" : "DIRECT";
}

export function approvePayment(payment: Payment, approverId: string): Payment {
  if (approvalRequirement(payment) === "SECOND_HUMAN" && approverId === payment.initiatorId) {
    throw new Error("Initiator cannot approve payment");
  }
  if (!canTransitionPayment(payment.status, "APPROVED")) {
    throw new Error(`Cannot approve payment in ${payment.status} state`);
  }
  return { ...payment, status: "APPROVED" };
}

export function rejectPayment(payment: Payment, approverId: string): Payment {
  if (approverId === payment.initiatorId) throw new Error("Initiator cannot reject payment");
  if (!canTransitionPayment(payment.status, "REJECTED")) {
    throw new Error(`Cannot reject payment in ${payment.status} state`);
  }
  return { ...payment, status: "REJECTED" };
}

export function createFundingTransfer(input: Omit<FundingTransfer, "id" | "status">): FundingTransfer {
  if (!Number.isSafeInteger(input.amountCents) || input.amountCents <= 0) {
    throw new Error("Funding amount must be positive cents");
  }
  return { ...input, id: crypto.randomUUID(), status: "PENDING" };
}
