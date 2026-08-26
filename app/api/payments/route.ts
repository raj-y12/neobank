import { NextResponse } from "next/server";
import { createPayment } from "@/src/domain/payment-lifecycle";
import { getPaymentRail } from "@/src/integrations/simulated-ach";
import { getAuthenticatedScope } from "@/src/lib/auth-scope";
import { createSupabasePaymentRepository } from "@/src/repositories/supabase-payment-repository";
import { dollarsToCents } from "@/src/domain/money";

export async function POST(request: Request) {
  try {
    const context = await getAuthenticatedScope();
    const body = await request.json() as { amountDollars?: string; recipient?: string; accountNumber?: string; routingNumber?: string; idempotencyKey?: string };
    if (!body.amountDollars || !body.recipient || !body.accountNumber || !body.routingNumber || !body.idempotencyKey) throw new Error("amountDollars, recipient, accountNumber, routingNumber, and idempotencyKey are required");
    if (!/^\d{4,17}$/.test(body.accountNumber)) throw new Error("Account number must contain 4 to 17 digits");
    if (!/^\d{9}$/.test(body.routingNumber)) throw new Error("Routing number must contain 9 digits");
    const amountCents = dollarsToCents(body.amountDollars);
    const payment = createPayment({ businessId: context.businessId, accountId: context.accountId, initiatorId: context.memberId, amountCents, currency: "USD", rail: "ACH", recipient: body.recipient, recipientBank: { accountNumber: body.accountNumber, routingNumber: body.routingNumber } });
    const repository = createSupabasePaymentRepository();
    const persisted = await repository.create(payment, body.idempotencyKey);
    if (persisted.status === "APPROVED") {
      try {
        await repository.reserveFunds(persisted);
      } catch (error) {
        await repository.setStatus(persisted.id, context.businessId, "REJECTED");
        throw error;
      }
      const transfer = await getPaymentRail().createOutbound({ amountCents: persisted.amountCents, recipient: persisted.recipient, ...persisted.recipientBank, idempotencyKey: `payment-submit:${persisted.id}` });
      await repository.setProviderTransfer(persisted.id, context.businessId, transfer.providerTransferId, "SUBMITTED");
      return NextResponse.json({ payment: { ...persisted, status: "SUBMITTED" }, submitted: true, mode: getPaymentRail().mode, providerTransferId: transfer.providerTransferId, approvalRequired: false }, { status: 201 });
    }
    return NextResponse.json({ payment: persisted, submitted: false, approvalRequired: true }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create payment" }, { status: 400 });
  }
}
