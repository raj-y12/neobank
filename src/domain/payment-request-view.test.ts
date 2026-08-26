import { describe, expect, it } from "vitest";
import { paymentStatusLabel } from "./payment-request-view";

describe("payment request view", () => {
  it("labels each payment lifecycle state", () => {
    expect(paymentStatusLabel("PENDING_APPROVAL")).toBe("Pending approval");
    expect(paymentStatusLabel("APPROVED")).toBe("Approved");
    expect(paymentStatusLabel("SUBMITTED")).toBe("Submitted");
    expect(paymentStatusLabel("SETTLED")).toBe("Settled");
    expect(paymentStatusLabel("REJECTED")).toBe("Rejected");
    expect(paymentStatusLabel("RETURNED")).toBe("Returned");
  });
});
