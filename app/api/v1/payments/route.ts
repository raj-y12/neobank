import { createPayment } from "@/src/domain/payment-lifecycle";
import { validateAchBankDetails } from "@/src/domain/ach";
import { dollarsToCents } from "@/src/domain/money";
import { createSupabasePaymentRepository } from "@/src/repositories/supabase-payment-repository";
import { getPublicApiScope, publicApiError } from "@/src/lib/public-api-auth";

export async function POST(request: Request) {
  try {
    const scope = await getPublicApiScope(request);
    const idempotencyKey = request.headers.get("idempotency-key")?.trim();
    if (!idempotencyKey) return Response.json({ error: "Idempotency-Key header is required", code: "missing_idempotency_key" }, { status: 400 });
    const body = await request.json() as { amountDollars?: string; recipient?: string; accountNumber?: string; routingNumber?: string };
    if (!body.amountDollars || !body.recipient || !body.accountNumber || !body.routingNumber) throw new Error("amountDollars, recipient, accountNumber, and routingNumber are required");
    validateAchBankDetails(body.accountNumber, body.routingNumber);
    const payment = createPayment({ businessId: scope.businessId, accountId: scope.accountId, initiatorId: scope.memberId, amountCents: dollarsToCents(body.amountDollars), currency: "USD", rail: "ACH", recipient: body.recipient, recipientBank: { accountNumber: body.accountNumber, routingNumber: body.routingNumber }, approvalMode: "HUMAN" });
    const repository = createSupabasePaymentRepository();
    const persisted = await repository.create(payment, idempotencyKey);
    try { await repository.reserveFunds(persisted); } catch (error) {
      if (persisted.status === "APPROVED" || persisted.status === "PENDING_APPROVAL") await repository.setStatus(persisted.id, scope.businessId, "REJECTED");
      throw error;
    }
    return Response.json({ payment: persisted, providerSubmitted: false, queue: "approval" }, { status: 201 });
  } catch (error) { return publicApiError(error, "Unable to queue payment"); }
}
