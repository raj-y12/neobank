import { NextResponse } from "next/server";
import { approvePayment } from "@/src/domain/payment-lifecycle";
import { getPaymentRail } from "@/src/integrations/simulated-ach";
import { getAuthenticatedScope } from "@/src/lib/auth-scope";
import { createSupabasePaymentRepository } from "@/src/repositories/supabase-payment-repository";
import { createSupabaseProviderAccountRepository } from "@/src/repositories/supabase-provider-account-repository";
import { isUuid } from "@/src/lib/identifiers";
import { isBusinessApprovedForBusiness } from "@/src/lib/onboarding-gate";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await getAuthenticatedScope();
    if (context.role !== "ADMIN") return NextResponse.json({ error: "ADMIN role required" }, { status: 403 });
    if (!await isBusinessApprovedForBusiness(context.businessId)) return NextResponse.json({ error: "Business verification must be approved before approving payments" }, { status: 403 });
    const { id } = await params;
    if (!isUuid(id)) return NextResponse.json({ error: "Payment not found in business scope" }, { status: 404 });
    const repository = createSupabasePaymentRepository();
    if (!await repository.memberBelongsToBusiness(context.memberId, context.businessId)) throw new Error("Approver is not a member of this business");
    const existing = await repository.get(id, context.businessId);
    if (!existing) throw new Error("Payment not found in business scope");
    const payment = approvePayment(existing, context.memberId);
    const rail = getPaymentRail();
    const providerAccount = rail.mode === "LIVE" ? await createSupabaseProviderAccountRepository().getActiveIncrease(context.businessId, context.accountId) : null;
    if (rail.mode === "LIVE" && !providerAccount) throw new Error("Configure an active Increase account for this business before sending money");
    await repository.reserveFunds(payment);
    await repository.addApproval(id, context.memberId, "APPROVED");
    const transfer = await rail.createOutbound({ amountCents: payment.amountCents, recipient: payment.recipient, ...payment.recipientBank, providerAccountId: providerAccount?.providerAccountId, idempotencyKey: `payment-submit:${payment.id}` });
    await repository.setProviderTransfer(id, context.businessId, transfer.providerTransferId, "SUBMITTED");
    return NextResponse.json({ payment: { ...payment, status: "SUBMITTED" }, submitted: true, mode: rail.mode, providerTransferId: transfer.providerTransferId });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to approve payment" }, { status: 400 });
  }
}
