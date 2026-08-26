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
