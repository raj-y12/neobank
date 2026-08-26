import { NextResponse } from "next/server";
import { getAuthenticatedScope } from "@/src/lib/auth-scope";
import { createClient } from "@supabase/supabase-js";
import { createSupabasePaymentRepository } from "@/src/repositories/supabase-payment-repository";

export async function GET() {
  try {
    const context = await getAuthenticatedScope();
    const repository = createSupabasePaymentRepository();
    if (context.role === "MEMBER") {
      return NextResponse.json({ businessId: context.businessId, mode: "request-history", requests: await repository.listForMember(context.businessId, context.memberId) });
    }
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Supabase payment storage is not configured");
    const client = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data, error } = await client.from("payments").select("id,amount_cents,recipient,status,initiator_member_id,created_at").eq("business_id", context.businessId).eq("status", "PENDING_APPROVAL").order("created_at", { ascending: true });
    if (error) throw error;
    const paymentRows = data ?? [];
    const paymentIds = paymentRows.map((payment) => payment.id as string);
    const initiatorIds = [...new Set(paymentRows.map((payment) => payment.initiator_member_id as string))];
    const [{ data: occurrences, error: occurrenceError }, { data: initiators, error: initiatorError }] = await Promise.all([
      paymentIds.length
        ? client.from("standing_order_occurrences").select("payment_id,standing_order_id,scheduled_date").in("payment_id", paymentIds)
        : Promise.resolve({ data: [], error: null }),
      initiatorIds.length
        ? client.from("business_members").select("id,first_name,last_name,email").in("id", initiatorIds)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (occurrenceError) throw occurrenceError;
    if (initiatorError) throw initiatorError;
    const occurrenceByPayment = new Map((occurrences ?? []).map((occurrence) => [occurrence.payment_id, occurrence]));
    const initiatorById = new Map((initiators ?? []).map((initiator) => [initiator.id, initiator]));
    return NextResponse.json({
      businessId: context.businessId,
      approvals: paymentRows.map((payment) => ({
        ...payment,
        standingOrder: occurrenceByPayment.get(payment.id) ?? null,
        initiator: initiatorById.get(payment.initiator_member_id) ?? null,
      })),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load approvals" }, { status: 400 });
  }
}
