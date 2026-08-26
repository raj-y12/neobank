import { NextResponse } from "next/server";
import { getAuthenticatedScope } from "@/src/lib/auth-scope";
import { createClient } from "@supabase/supabase-js";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const scope = await getAuthenticatedScope();
    const { id } = await params;
    const body = await request.json() as { status?: string; nextRunDate?: string; insufficientFundsPolicy?: string };
    const update: Record<string, string> = {};
    if (body.status && /^(ACTIVE|PAUSED|CANCELED)$/.test(body.status)) update.status = body.status; else if (body.status) throw new Error("Invalid standing-order status");
    if (body.nextRunDate) update.next_run_date = body.nextRunDate;
    if (body.insufficientFundsPolicy && /^(SKIP|RETRY_NEXT_DAY)$/.test(body.insufficientFundsPolicy)) update.insufficient_funds_policy = body.insufficientFundsPolicy; else if (body.insufficientFundsPolicy) throw new Error("Invalid insufficient-funds policy");
    if (!Object.keys(update).length) throw new Error("No supported fields to update");
    const client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data, error } = await client.from("standing_orders").update({ ...update, updated_at: new Date().toISOString() }).eq("id", id).eq("business_id", scope.businessId).select("*").single();
    if (error) throw error;
    return NextResponse.json({ standingOrder: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update standing order" }, { status: 400 });
  }
}
