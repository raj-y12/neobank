import { NextResponse } from "next/server";
import { createSupabaseCardReversalRepository } from "@/src/repositories/supabase-card-reversal-repository";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json() as { providerReturnTransactionId?: string; returnCardToken?: string; returnAmountCents?: number };
    const returnAmountCents = body.returnAmountCents;
    if (!body.providerReturnTransactionId || !body.returnCardToken || typeof returnAmountCents !== "number" || !Number.isSafeInteger(returnAmountCents)) {
      return NextResponse.json({ error: "providerReturnTransactionId, returnCardToken, and returnAmountCents are required" }, { status: 400 });
    }
    const intent = await createSupabaseCardReversalRepository().linkReturn({
      intentId: id,
      providerReturnTransactionId: body.providerReturnTransactionId,
      returnCardToken: body.returnCardToken,
      returnAmountCents,
    });
    return NextResponse.json({ intent });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to link return";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
