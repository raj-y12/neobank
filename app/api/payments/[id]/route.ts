import { NextResponse } from "next/server";
import { getAuthenticatedScope } from "@/src/lib/auth-scope";
import { createSupabasePaymentRepository } from "@/src/repositories/supabase-payment-repository";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const scope = await getAuthenticatedScope();
    const { id } = await params;
    const payment = await createSupabasePaymentRepository().get(id, scope.businessId);
    if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    if (scope.role === "MEMBER" && payment.initiatorId !== scope.memberId) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    return NextResponse.json({ payment });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load payment" }, { status: 400 });
  }
}
