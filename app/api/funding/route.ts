import { NextResponse } from "next/server";
import { isBusinessApproved } from "@/src/domain/onboarding";
import { createFundingTransfer } from "@/src/domain/payment-lifecycle";
import { getPaymentRail } from "@/src/integrations/simulated-ach";
import { getAuthenticatedScope } from "@/src/lib/auth-scope";
import { createSupabaseOnboardingRepository } from "@/src/repositories/supabase-onboarding-repository";
import { createSupabaseFundingAccountRepository } from "@/src/repositories/supabase-funding-account-repository";
import { createSupabaseFundingRepository } from "@/src/repositories/supabase-funding-repository";
import { createSupabaseProviderAccountRepository } from "@/src/repositories/supabase-provider-account-repository";

export async function POST(request: Request) {
  try {
    const scope = await getAuthenticatedScope();
    if (scope.role !== "ADMIN") return NextResponse.json({ error: "ADMIN role required" }, { status: 403 });
    const body = await request.json() as { amountCents?: number; idempotencyKey?: string };
    if (!body.amountCents || !body.idempotencyKey) throw new Error("amountCents and idempotencyKey are required");
    const onboarding = await createSupabaseOnboardingRepository().get(scope.businessId);
    if (!isBusinessApproved(onboarding)) return NextResponse.json({ error: "Business verification must be approved before funding" }, { status: 403 });
    const rail = getPaymentRail();
    const repository = createSupabaseFundingRepository();
    const existing = await repository.getByIdempotencyKey(scope.businessId, body.idempotencyKey);
    if (existing) {
      if (existing.amountCents !== body.amountCents || existing.accountId !== scope.accountId || existing.rail !== "ACH") {
        throw new Error("Idempotency key was already used with different request data");
      }
      return NextResponse.json({ mode: rail.mode, funding: existing }, { status: 201 });
    }
    const linkedAccount = await createSupabaseFundingAccountRepository().get(scope.businessId);
    if (!linkedAccount) throw new Error("Link a bank account before adding money");
    const funding = createFundingTransfer({ businessId: scope.businessId, accountId: scope.accountId, linkedFundingAccountId: linkedAccount.id, amountCents: body.amountCents, rail: "ACH" });
    const providerAccount = rail.mode === "LIVE" ? await createSupabaseProviderAccountRepository().getActiveIncrease(scope.businessId, scope.accountId) : null;
    if (rail.mode === "LIVE" && !providerAccount) throw new Error("Configure an active Increase account for this business before adding money");
    const source = rail.mode === "LIVE" ? await createSupabaseFundingAccountRepository().getAchSource(scope.businessId) : undefined;
    const transfer = await rail.createInbound({ amountCents: funding.amountCents, idempotencyKey: body.idempotencyKey, providerAccountId: providerAccount?.providerAccountId, accountNumberId: providerAccount?.providerAccountNumberId ?? undefined, accountNumber: source?.accountNumber, routingNumber: source?.routingNumber });
    const persisted = await repository.create(funding, transfer.providerTransferId, body.idempotencyKey);
    return NextResponse.json({ mode: rail.mode, funding: persisted }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create funding" }, { status: 400 });
  }
}
