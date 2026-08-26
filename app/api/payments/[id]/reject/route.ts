import { NextResponse } from "next/server";
import { rejectPayment } from "@/src/domain/payment-lifecycle";
import { getAuthenticatedScope } from "@/src/lib/auth-scope";
import { createSupabasePaymentRepository } from "@/src/repositories/supabase-payment-repository";
import { isUuid } from "@/src/lib/identifiers";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await getAuthenticatedScope();
    if (context.role !== "ADMIN") return NextResponse.json({ error: "ADMIN role required" }, { status: 403 });
    const { id } = await params;
    if (!isUuid(id)) return NextResponse.json({ error: "Payment not found in business scope" }, { status: 404 });
    const repository = createSupabasePaymentRepository();
    const existing = await repository.get(id, context.businessId);
    if (!existing) throw new Error("Payment not found in business scope");
    if (existing.status === "REJECTED") return NextResponse.json({ payment: existing }, { status: 200 });
    const payment = rejectPayment(existing, context.memberId);
    await repository.addApproval(id, context.memberId, "REJECTED");
    await repository.releaseFunds(existing);
    await repository.setStatus(id, context.businessId, "REJECTED");
    return NextResponse.json({ payment }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to reject payment" }, { status: 400 });
  }
}
