import { NextResponse } from "next/server";
import { createSupabaseCardReversalRepository } from "@/src/repositories/supabase-card-reversal-repository";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { originalTransactionId?: string; idempotencyKey?: string };
    if (!body.originalTransactionId || !body.idempotencyKey) {
      return NextResponse.json({ error: "originalTransactionId and idempotencyKey are required" }, { status: 400 });
    }
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
