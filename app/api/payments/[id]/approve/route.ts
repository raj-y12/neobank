import { NextResponse } from "next/server";
import { approvePayment } from "@/src/domain/payment-lifecycle";
import { getPaymentRail } from "@/src/integrations/simulated-ach";
import { getAuthenticatedScope } from "@/src/lib/auth-scope";
import { createSupabasePaymentRepository } from "@/src/repositories/supabase-payment-repository";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await getAuthenticatedScope();
    if (context.role !== "ADMIN") return NextResponse.json({ error: "ADMIN role required" }, { status: 403 });
    const { id } = await params;
    const repository = createSupabasePaymentRepository();
    if (!await repository.memberBelongsToBusiness(context.memberId, context.businessId)) throw new Error("Approver is not a member of this business");
    const existing = await repository.get(id, context.businessId);
    if (!existing) throw new Error("Payment not found in business scope");
    const payment = approvePayment(existing, context.memberId);
    await repository.reserveFunds(payment);
    await repository.addApproval(id, context.memberId, "APPROVED");
    const transfer = await getPaymentRail().createOutbound({ amountCents: payment.amountCents, recipient: payment.recipient, ...payment.recipientBank, idempotencyKey: `payment-submit:${payment.id}` });
    await repository.setProviderTransfer(id, context.businessId, transfer.providerTransferId, "SUBMITTED");
    return NextResponse.json({ payment: { ...payment, status: "SUBMITTED" }, submitted: true, mode: getPaymentRail().mode, providerTransferId: transfer.providerTransferId });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to approve payment" }, { status: 400 });
  }
}
