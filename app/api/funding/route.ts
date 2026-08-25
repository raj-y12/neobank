import { NextResponse } from "next/server";
import { isBusinessApproved } from "@/src/domain/onboarding";
import { createFundingTransfer } from "@/src/domain/payment-lifecycle";
import { getPaymentRail } from "@/src/integrations/simulated-ach";
import { getAuthenticatedScope } from "@/src/lib/auth-scope";
import { createSupabaseOnboardingRepository } from "@/src/repositories/supabase-onboarding-repository";
import { createSupabaseFundingAccountRepository } from "@/src/repositories/supabase-funding-account-repository";
import { createSupabaseFundingRepository } from "@/src/repositories/supabase-funding-repository";

export async function POST(request: Request) {
  try {
    const scope = await getAuthenticatedScope();
    const body = await request.json() as { amountCents?: number; idempotencyKey?: string };
    if (!body.amountCents || !body.idempotencyKey) throw new Error("amountCents and idempotencyKey are required");
    const onboarding = await createSupabaseOnboardingRepository().get(scope.businessId);
    if (!isBusinessApproved(onboarding)) return NextResponse.json({ error: "Business verification must be approved before funding" }, { status: 403 });
    const linkedAccount = await createSupabaseFundingAccountRepository().get(scope.businessId);
    if (!linkedAccount) throw new Error("Link a bank account before adding money");
    const funding = createFundingTransfer({ businessId: scope.businessId, accountId: scope.accountId, linkedFundingAccountId: linkedAccount.id, amountCents: body.amountCents, rail: "ACH" });
    const source = await createSupabaseFundingAccountRepository().getAchSource(scope.businessId);
    const transfer = await getPaymentRail().createInbound({ amountCents: funding.amountCents, idempotencyKey: body.idempotencyKey, accountNumber: source.accountNumber, routingNumber: source.routingNumber });
    await createSupabaseFundingRepository().create(funding, transfer.providerTransferId, body.idempotencyKey);
    return NextResponse.json({ mode: getPaymentRail().mode, funding: { ...funding, providerTransferId: transfer.providerTransferId } }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create funding" }, { status: 400 });
  }
}
