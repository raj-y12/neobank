import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { projectLithicTransaction } from "@/src/domain/lithic-transaction-projection";
import { reverseCardSettlement } from "@/src/domain/ledger";
import { createSupabaseCardReversalRepository } from "@/src/repositories/supabase-card-reversal-repository";
import { createSupabaseCardTransactionRepository } from "@/src/repositories/supabase-card-transaction-repository";
import { createSupabaseLedgerRepository } from "@/src/repositories/supabase-ledger-repository";

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
    await replayStoredReturn(intent);
    return NextResponse.json({ intent });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to link return";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

async function replayStoredReturn(intent: { id: string; originalTransactionId: string; providerReturnTransactionId: string | null }) {
  if (!intent.providerReturnTransactionId) return;
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error("Supabase provider event storage is not configured");

  const client = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data, error } = await client
    .from("provider_events")
    .select("provider_event_id,payload")
    .eq("provider", "lithic")
    .eq("event_type", "card_transaction.updated")
    .order("received_at", { ascending: false })
    .limit(100);
  if (error) throw error;

  const stored = (data ?? []).find((row) => {
    const payload = row.payload;
    return typeof payload === "object" && payload !== null && "token" in payload && payload.token === intent.providerReturnTransactionId;
  });
  if (!stored || typeof stored.payload !== "object" || stored.payload === null) return;

  const payload = stored.payload as Parameters<typeof projectLithicTransaction>[0]["payload"];
  const projection = projectLithicTransaction({
    providerEventId: stored.provider_event_id,
    reversalOfTransactionId: intent.originalTransactionId,
    payload,
  });
  await createSupabaseCardTransactionRepository().project(projection, stored.payload);
  if (projection.event.eventType !== "RETURN" || !projection.event.settlementAmountCents) return;

  await createSupabaseLedgerRepository().record(
    reverseCardSettlement(
      projection.event.settlementAmountCents,
      projection.transaction.providerTransactionId,
      intent.originalTransactionId,
      projection.event.occurredAt?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    ),
    `lithic:${stored.provider_event_id}:settlement-reversal`,
  );
  await createSupabaseCardReversalRepository().markPosted(intent.id);
}
