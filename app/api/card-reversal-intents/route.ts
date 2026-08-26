import { NextResponse } from "next/server";
import { createSupabaseCardReversalRepository } from "@/src/repositories/supabase-card-reversal-repository";
import { getAuthenticatedScope } from "@/src/lib/auth-scope";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { canViewCard } from "@/src/domain/card-access";
import { getBusinessCardAssignment } from "@/src/repositories/supabase-business-card-repository";
import { isUuid } from "@/src/lib/identifiers";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { originalTransactionId?: string; idempotencyKey?: string };
    if (!body.originalTransactionId || !body.idempotencyKey) {
      return NextResponse.json({ error: "originalTransactionId and idempotencyKey are required" }, { status: 400 });
    }
    if (!isUuid(body.originalTransactionId)) return NextResponse.json({ error: "Card transaction not found" }, { status: 404 });
    const scope = await getAuthenticatedScope();
    const { data: transaction, error: transactionError } = await createSupabaseAdminClient().from("card_transactions").select("card_token").eq("id", body.originalTransactionId).maybeSingle<{ card_token: string }>();
    if (transactionError) throw transactionError;
    const assignment = transaction ? await getBusinessCardAssignment(scope.businessId, transaction.card_token) : null;
    if (!transaction || !assignment || !canViewCard({ role: scope.role, currentMemberId: scope.memberId, assignedMemberId: assignment.memberId })) return NextResponse.json({ error: "Card is outside the authenticated business scope" }, { status: 404 });
    const intent = await createSupabaseCardReversalRepository().createIntent({
      originalTransactionId: body.originalTransactionId,
      idempotencyKey: body.idempotencyKey,
    });
    return NextResponse.json({ intent }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create reversal intent";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
