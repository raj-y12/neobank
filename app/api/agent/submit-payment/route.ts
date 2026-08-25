import { NextResponse } from "next/server";
import { createPayment } from "@/src/domain/payment-lifecycle";
import { getAuthenticatedScope } from "@/src/lib/auth-scope";
import { createSupabasePaymentRepository } from "@/src/repositories/supabase-payment-repository";

export async function POST(request: Request) {
  try {
    const context = await getAuthenticatedScope();
    const body = await request.json() as { amountCents?: number; recipient?: string; idempotencyKey?: string };
    if (!body.amountCents || !body.recipient || !body.idempotencyKey) throw new Error("amountCents, recipient, and idempotencyKey are required");
    const payment = createPayment({ businessId: context.businessId, accountId: context.accountId, initiatorId: context.memberId, amountCents: body.amountCents, currency: "USD", rail: "ACH", recipient: body.recipient });
    await createSupabasePaymentRepository().create(payment, body.idempotencyKey);
    return NextResponse.json({ payment, providerSubmitted: false, queue: "approval" }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to queue agent payment" }, { status: 400 });
  }
}
