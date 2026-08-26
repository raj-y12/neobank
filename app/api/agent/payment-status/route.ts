import { NextResponse } from "next/server";
import { getAuthenticatedScope } from "@/src/lib/auth-scope";
import { createSupabasePaymentRepository } from "@/src/repositories/supabase-payment-repository";
import { isUuid } from "@/src/lib/identifiers";

export async function GET(request: Request) {
  try {
    const context = await getAuthenticatedScope();
    const paymentId = new URL(request.url).searchParams.get("paymentId");
    if (!paymentId) return NextResponse.json({ error: "paymentId is required" }, { status: 400 });
    if (!isUuid(paymentId)) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    const payment = await createSupabasePaymentRepository().get(paymentId, context.businessId);
    if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    if (context.role === "MEMBER" && payment.initiatorId !== context.memberId) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    return NextResponse.json({ businessId: context.businessId, paymentId, status: payment.status, amountCents: payment.amountCents, recipient: payment.recipient, source: "payment_events" });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 });
  }
}
