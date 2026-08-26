import { describe, expect, it } from "vitest";
import { toPublicPayment } from "./public-api-payment";

describe("toPublicPayment", () => {
  it("removes recipient bank details from public payment responses", () => {
    const result = toPublicPayment({
      id: "payment-1",
      businessId: "business-a",
      accountId: "account-a",
      initiatorId: "member-a",
      amountCents: 100,
      currency: "USD",
      rail: "ACH",
      recipient: "Acme",
      recipientBank: { accountNumber: "1234567890", routingNumber: "021000021" },
      status: "PENDING_APPROVAL",
    });

    expect(result).toEqual({
      id: "payment-1",
      businessId: "business-a",
      accountId: "account-a",
      initiatorId: "member-a",
      amountCents: 100,
      currency: "USD",
      rail: "ACH",
      recipient: "Acme",
      status: "PENDING_APPROVAL",
    });
    expect(result).not.toHaveProperty("recipientBank");
  });
});
