import { describe, expect, it } from "vitest";
import { SupabasePaymentRepository } from "./supabase-payment-repository";

describe("SupabasePaymentRepository.listForMember", () => {
  it("filters by business and initiator and returns a safe DTO", async () => {
    const filters: Array<[string, string]> = [];
    const query = {
      select: () => query,
      eq: (field: string, value: string) => { filters.push([field, value]); return query; },
      order: async () => ({ data: [{ id: "payment-1", amount_cents: 1250, recipient: { name: "Acme" }, status: "PENDING_APPROVAL", created_at: "2026-08-26T10:00:00Z", initiator_member_id: "member-other", recipient_bank: { accountNumber: "secret" } }], error: null }),
    };
    const client = { from: () => query } as never;
    const result = await new SupabasePaymentRepository(client).listForMember("business-a", "member-a");

    expect(filters).toEqual([["business_id", "business-a"], ["initiator_member_id", "member-a"]]);
    expect(result).toEqual([{ id: "payment-1", amountCents: 1250, recipient: "Acme", status: "PENDING_APPROVAL", createdAt: "2026-08-26T10:00:00Z" }]);
    expect(result[0]).not.toHaveProperty("initiatorMemberId");
    expect(result[0]).not.toHaveProperty("recipientBank");
  });
});

describe("SupabasePaymentRepository.getProviderTransferId", () => {
  it("reads only the provider reference for an owned payment", async () => {
    const filters: Array<[string, string]> = [];
    const query = {
      select: () => query,
      eq: (field: string, value: string) => { filters.push([field, value]); return query; },
      maybeSingle: async () => ({ data: { provider_payment_id: "sim-out-payment-submit:payment-1" }, error: null }),
    };
    const client = { from: () => query } as never;

    await expect(new SupabasePaymentRepository(client).getProviderTransferId("payment-1", "business-a")).resolves.toBe("sim-out-payment-submit:payment-1");
    expect(filters).toEqual([["id", "payment-1"], ["business_id", "business-a"]]);
  });
});

describe("SupabasePaymentRepository.create", () => {
  it("rejects a reused idempotency key when the request changes", async () => {
    const query = {
      select: () => query,
      eq: () => query,
      maybeSingle: async () => ({
        data: {
          id: "payment-1",
          business_id: "business-a",
          account_id: "account-a",
          initiator_member_id: "member-a",
          amount_cents: 100,
          currency: "USD",
          rail: "ACH",
          recipient: { name: "Acme", accountNumber: "1234567890", routingNumber: "021000021" },
          status: "PENDING_APPROVAL",
        },
        error: null,
      }),
      insert: () => { throw new Error("insert should not be called"); },
    };
    const client = { from: () => query } as never;

    await expect(new SupabasePaymentRepository(client).create({
      id: "payment-2",
      businessId: "business-a",
      accountId: "account-a",
      initiatorId: "member-a",
      amountCents: 200,
      currency: "USD",
      rail: "ACH",
      recipient: "Acme",
      recipientBank: { accountNumber: "1234567890", routingNumber: "021000021" },
      status: "PENDING_APPROVAL",
    }, "same-key")).rejects.toThrow("different request data");
  });

  it("does not continue when a duplicate insert cannot be read in this business", async () => {
    const query = {
      select: () => query,
      eq: () => query,
      maybeSingle: async () => ({ data: null, error: null }),
      insert: async () => ({ error: { code: "23505", message: "duplicate key" } }),
    };
    const client = { from: () => query } as never;

    await expect(new SupabasePaymentRepository(client).create({
      id: "payment-2",
      businessId: "business-a",
      accountId: "account-a",
      initiatorId: "member-a",
      amountCents: 200,
      currency: "USD",
      rail: "ACH",
      recipient: "Acme",
      recipientBank: { accountNumber: "1234567890", routingNumber: "021000021" },
      status: "PENDING_APPROVAL",
    }, "same-key")).rejects.toThrow("different request data");
  });
});
