import { NextResponse } from "next/server";
import { getAuthenticatedScope } from "@/src/lib/auth-scope";
import { createClient } from "@supabase/supabase-js";
import { isUuid } from "@/src/lib/identifiers";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await getAuthenticatedScope();
    if (context.role !== "ADMIN") return NextResponse.json({ error: "ADMIN role required" }, { status: 403 });
    const { id } = await params;
    if (!isUuid(id)) {
      return NextResponse.json({ error: "Reconciliation break not found" }, { status: 404 });
    }
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Supabase reconciliation storage is not configured");
    const client = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data, error } = await client.from("reconciliation_breaks").update({ status: "RESOLVED", resolved_at: new Date().toISOString() }).eq("id", id).eq("business_id", context.businessId).select("id").maybeSingle<{ id: string }>();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Reconciliation break not found" }, { status: 404 });
    return NextResponse.json({ resolved: true, id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to resolve break" }, { status: 400 });
  }
}
