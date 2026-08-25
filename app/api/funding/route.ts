import { NextResponse } from "next/server";
import { contextFromHeaders } from "@/src/auth/authorization";
import { createFundingTransfer } from "@/src/domain/payment-lifecycle";
import { getPaymentRail } from "@/src/integrations/simulated-ach";
import { createSupabaseFundingRepository } from "@/src/repositories/supabase-funding-repository";

export async function POST(request: Request) {
  try {
    const context = contextFromHeaders(request.headers);
    const body = await request.json() as { amountCents?: number; linkedFundingAccountId?: string; idempotencyKey?: string };
    if (!body.amountCents || !body.linkedFundingAccountId || !body.idempotencyKey) throw new Error("amountCents, linkedFundingAccountId, and idempotencyKey are required");
    const funding = createFundingTransfer({ businessId: context.businessId, accountId: context.accountId, linkedFundingAccountId: body.linkedFundingAccountId, amountCents: body.amountCents, rail: "ACH" });
    const source = await createSupabaseFundingRepository().getSourceDetails(body.linkedFundingAccountId, context.businessId);
    const transfer = await getPaymentRail().createInbound({ amountCents: funding.amountCents, idempotencyKey: body.idempotencyKey, accountNumber: source.accountNumber, routingNumber: source.routingNumber });
    await createSupabaseFundingRepository().create(funding, transfer.providerTransferId, body.idempotencyKey);
    return NextResponse.json({ mode: getPaymentRail().mode, funding: { ...funding, providerTransferId: transfer.providerTransferId } }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create funding" }, { status: 400 });
  }
}
