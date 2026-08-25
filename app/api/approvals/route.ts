import { NextResponse } from "next/server";
import { contextFromHeaders } from "@/src/auth/authorization";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  try {
    const context = contextFromHeaders(request.headers);
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Supabase payment storage is not configured");
    const client = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data, error } = await client.from("payments").select("id,amount_cents,recipient,status,initiator_member_id,created_at").eq("business_id", context.businessId).eq("status", "PENDING_APPROVAL").order("created_at", { ascending: true });
    if (error) throw error;
    return NextResponse.json({ businessId: context.businessId, approvals: data ?? [] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load approvals" }, { status: 400 });
  }
}
