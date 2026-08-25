import { describe, expect, it } from "vitest";
import {
  approvalRequirement,
  approvePayment,
  canTransitionFunding,
  canTransitionPayment,
  createFundingTransfer,
  createPayment,
} from "./payment-lifecycle";

describe("payment lifecycle", () => {
  it("requires a second human for payments above the threshold", () => {
    const payment = createPayment({
      businessId: "biz-1",
      accountId: "acct-1",
      initiatorId: "member-1",
      amountCents: 100_001,
      currency: "USD",
      rail: "ACH",
      recipient: "Vendor",
    });

    expect(payment.status).toBe("PENDING_APPROVAL");
    expect(approvalRequirement(payment)).toBe("SECOND_HUMAN");
    expect(() => approvePayment(payment, "member-1")).toThrow("Initiator cannot approve");
    expect(approvePayment(payment, "member-2").status).toBe("APPROVED");
  });

  it("rejects payment transition shortcuts", () => {
    expect(canTransitionPayment("PENDING_APPROVAL", "SETTLED")).toBe(false);
    expect(canTransitionPayment("APPROVED", "SUBMITTED")).toBe(true);
    expect(canTransitionPayment("RETURNED", "SETTLED")).toBe(false);
  });

  it("keeps funding pending until an explicit settlement event", () => {
    const funding = createFundingTransfer({
      businessId: "biz-1",
      accountId: "acct-1",
      linkedFundingAccountId: "fund-1",
      amountCents: 50_00,
      rail: "ACH",
    });

    expect(funding.status).toBe("PENDING");
    expect(canTransitionFunding("PENDING", "SETTLED")).toBe(true);
    expect(canTransitionFunding("SETTLED", "PENDING")).toBe(false);
  });
});
