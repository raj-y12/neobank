import type { PaymentStatus } from "./payment-lifecycle";

export type PaymentRequestView = {
  id: string;
  recipient: string;
  amountCents: number;
  status: PaymentStatus;
  createdAt: string;
};

export function paymentStatusLabel(status: PaymentStatus) {
  return {
    PENDING_APPROVAL: "Pending approval",
    APPROVED: "Approved",
    SUBMITTED: "Submitted",
    SETTLED: "Settled",
    REJECTED: "Rejected",
    RETURNED: "Returned",
  }[status];
}
