import { NextResponse } from "next/server";
import { contextFromHeaders } from "@/src/auth/authorization";
import { createClient } from "@supabase/supabase-js";
import { ageBucket } from "@/src/domain/reconciliation";

export async function GET(request: Request) {
  try {
    const context = contextFromHeaders(request.headers);
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Supabase reconciliation storage is not configured");
    const client = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data, error } = await client.from("reconciliation_breaks").select("id,break_type,provider_reference,expected_amount_cents,actual_amount_cents,status,created_at").eq("business_id", context.businessId).order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ businessId: context.businessId, breaks: (data ?? []).map((row) => ({ ...row, ageBucket: ageBucket(row.created_at) })), source: "reconciliation_breaks" });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 });
  }
}
