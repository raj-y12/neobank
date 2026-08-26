import { NextResponse } from "next/server";
import { createPayment } from "@/src/domain/payment-lifecycle";
import { getAuthenticatedScope } from "@/src/lib/auth-scope";
import { createSupabasePaymentRepository } from "@/src/repositories/supabase-payment-repository";
import { dollarsToCents } from "@/src/domain/money";
import { validateAchBankDetails } from "@/src/domain/ach";
import { toPublicPayment } from "@/src/lib/public-api-payment";

export async function POST(request: Request) {
  try {
    const context = await getAuthenticatedScope();
    const body = await request.json() as { amountDollars?: string; recipient?: string; accountNumber?: string; routingNumber?: string; idempotencyKey?: string };
    if (!body.amountDollars || !body.recipient || !body.accountNumber || !body.routingNumber || !body.idempotencyKey) throw new Error("amountDollars, recipient, accountNumber, routingNumber, and idempotencyKey are required");
    validateAchBankDetails(body.accountNumber, body.routingNumber);
    const payment = createPayment({ businessId: context.businessId, accountId: context.accountId, initiatorId: context.memberId, amountCents: dollarsToCents(body.amountDollars), currency: "USD", rail: "ACH", recipient: body.recipient, recipientBank: { accountNumber: body.accountNumber, routingNumber: body.routingNumber }, approvalMode: "HUMAN" });
    const repository = createSupabasePaymentRepository();
    const persisted = await repository.create(payment, body.idempotencyKey);
    try {
      await repository.reserveFunds(persisted);
    } catch (error) {
      if (persisted.status === "APPROVED" || persisted.status === "PENDING_APPROVAL") {
        await repository.setStatus(persisted.id, context.businessId, "REJECTED");
      }
      throw error;
    }
    return NextResponse.json({ payment: toPublicPayment(persisted), providerSubmitted: false, queue: "approval" }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to queue agent payment" }, { status: 400 });
  }
}
