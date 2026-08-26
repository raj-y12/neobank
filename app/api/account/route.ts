import { NextResponse } from "next/server";
import { getAuthenticatedScope } from "@/src/lib/auth-scope";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseLedgerRepository } from "@/src/repositories/supabase-ledger-repository";

export async function GET() {
  try {
    const context = await getAuthenticatedScope();
    if (context.role !== "ADMIN") return NextResponse.json({ error: "ADMIN role required" }, { status: 403 });
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Supabase account storage is not configured");
    const client = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
    const [{ data: business, error: businessError }, { data: linkedBank, error: bankError }, balances] = await Promise.all([
      client.from("businesses").select("id,legal_name,status").eq("id", context.businessId).single(),
      client.from("linked_funding_accounts").select("id,institution_name,account_mask,status,provider").eq("business_id", context.businessId).eq("status", "LINKED").maybeSingle(),
      createSupabaseLedgerRepository().getBalances({ businessId: context.businessId, accountId: context.accountId }),
    ]);
    if (businessError) throw businessError;
    if (bankError) throw bankError;
    return NextResponse.json({ business, linkedBank, balances, accountId: context.accountId });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load account" }, { status: 400 });
  }
}
