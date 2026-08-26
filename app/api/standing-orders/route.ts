import { NextResponse } from "next/server";
import { getAuthenticatedScope } from "@/src/lib/auth-scope";
import { createClient } from "@supabase/supabase-js";

function adminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase standing-order storage is not configured");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function GET() {
  try {
    const scope = await getAuthenticatedScope();
    const { data, error } = await adminClient().from("standing_orders").select("*").eq("business_id", scope.businessId).order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ standingOrders: data ?? [] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to list standing orders" }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const scope = await getAuthenticatedScope();
    const body = await request.json() as { amountCents?: number; recipient?: unknown; frequency?: string; nextRunDate?: string; insufficientFundsPolicy?: string };
    if (!Number.isSafeInteger(body.amountCents) || (body.amountCents ?? 0) <= 0 || !body.recipient || !body.nextRunDate) throw new Error("amountCents, recipient, and nextRunDate are required");
    if (!/^(DAILY|WEEKLY|MONTHLY)$/.test(body.frequency ?? "")) throw new Error("frequency must be DAILY, WEEKLY, or MONTHLY");
    if (!/^(SKIP|RETRY_NEXT_DAY)$/.test(body.insufficientFundsPolicy ?? "SKIP")) throw new Error("Invalid insufficient-funds policy");
    const { data, error } = await adminClient().from("standing_orders").insert({ business_id: scope.businessId, account_id: scope.accountId, amount_cents: body.amountCents, recipient: body.recipient, frequency: body.frequency, next_run_date: body.nextRunDate, insufficient_funds_policy: body.insufficientFundsPolicy ?? "SKIP" }).select("*").single();
    if (error) throw error;
    return NextResponse.json({ standingOrder: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create standing order" }, { status: 400 });
  }
}
