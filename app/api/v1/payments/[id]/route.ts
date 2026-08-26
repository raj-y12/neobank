import { createSupabasePaymentRepository } from "@/src/repositories/supabase-payment-repository";
import { getPublicApiScope, publicApiError } from "@/src/lib/public-api-auth";
import { toPublicPayment } from "@/src/lib/public-api-payment";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const scope = await getPublicApiScope(request);
    const { id } = await context.params;
    const payment = await createSupabasePaymentRepository().get(id, scope.businessId);
    if (!payment || (scope.role === "MEMBER" && payment.initiatorId !== scope.memberId)) return Response.json({ error: "Payment not found", code: "not_found" }, { status: 404 });
    return Response.json({ payment: toPublicPayment(payment) });
  } catch (error) { return publicApiError(error, "Unable to load payment"); }
}
