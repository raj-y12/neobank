import { NextResponse } from "next/server";
import { createPayment } from "@/src/domain/payment-lifecycle";
import { getPaymentRail } from "@/src/integrations/simulated-ach";
import { getAuthenticatedScope } from "@/src/lib/auth-scope";
import { createSupabasePaymentRepository } from "@/src/repositories/supabase-payment-repository";
import { createSupabaseLedgerRepository } from "@/src/repositories/supabase-ledger-repository";

export async function POST(request: Request) {
  try {
    const context = await getAuthenticatedScope();
    const body = await request.json() as { amountCents?: number; recipient?: string; idempotencyKey?: string };
    if (!body.amountCents || !body.recipient || !body.idempotencyKey) throw new Error("amountCents, recipient, and idempotencyKey are required");
    const payment = createPayment({ businessId: context.businessId, accountId: context.accountId, initiatorId: context.memberId, amountCents: body.amountCents, currency: "USD", rail: "ACH", recipient: body.recipient });
    const balances = await createSupabaseLedgerRepository().getBalances({ businessId: context.businessId, accountId: context.accountId });
    if (balances.availableBalanceCents < payment.amountCents) throw new Error("Insufficient available funds");
    const repository = createSupabasePaymentRepository();
    await repository.create(payment, body.idempotencyKey);
    if (payment.status === "APPROVED") {
      const transfer = await getPaymentRail().createOutbound({ amountCents: payment.amountCents, recipient: payment.recipient, idempotencyKey: `payment-submit:${payment.id}` });
      await repository.setProviderTransfer(payment.id, context.businessId, transfer.providerTransferId, "SUBMITTED");
      return NextResponse.json({ payment: { ...payment, status: "SUBMITTED" }, submitted: true, mode: getPaymentRail().mode, providerTransferId: transfer.providerTransferId, approvalRequired: false }, { status: 201 });
    }
    return NextResponse.json({ payment, submitted: false, approvalRequired: true }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create payment" }, { status: 400 });
  }
}
