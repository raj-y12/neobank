import { NextResponse } from "next/server";
import { contextFromHeaders } from "@/src/auth/authorization";
import { encryptPlaidAccessToken } from "@/src/integrations/plaid/client";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const context = contextFromHeaders(request.headers);
    const body = await request.json() as { publicToken?: string; institutionName?: string; accountMask?: string; itemId?: string };
    if (!body.publicToken || !body.itemId) throw new Error("publicToken and itemId are required");
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Supabase funding storage is not configured");
    const client = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
    const token = body.publicToken.startsWith("simulated_") ? "SIMULATED_ENCRYPTED_TOKEN" : encryptPlaidAccessToken(body.publicToken);
    const { data, error } = await client.from("linked_funding_accounts").upsert({ business_id: context.businessId, account_id: context.accountId, provider: "PLAID", provider_item_id: body.itemId, encrypted_access_token: token, institution_name: body.institutionName ?? "Demo bank", account_mask: body.accountMask ?? "4821", status: "LINKED" }, { onConflict: "provider,provider_item_id" }).select("id,institution_name,account_mask,status").single();
    if (error) throw error;
    return NextResponse.json({ mode: "SIMULATED", account: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to link funding account" }, { status: 400 });
  }
}
