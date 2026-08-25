import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthenticatedScope } from "@/src/lib/auth-scope";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const scope = await getAuthenticatedScope();
    const { id } = await params;
    const client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data, error } = await client.from("funding_transfers").select("id,status,settled_at,returned_at").eq("id", id).eq("business_id", scope.businessId).eq("account_id", scope.accountId).maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Funding transfer not found" }, { status: 404 });
    return NextResponse.json({ funding: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to read funding transfer" }, { status: 401 });
  }
}
