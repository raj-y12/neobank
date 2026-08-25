import { NextResponse } from "next/server";
import { contextFromHeaders } from "@/src/auth/authorization";
import { encryptPlaidAccessToken, exchangePlaidPublicToken, getPlaidAchNumbers } from "@/src/integrations/plaid/client";
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
    const simulated = body.publicToken.startsWith("simulated_");
    const plaid = simulated ? { access_token: "SIMULATED_TOKEN_NOT_A_CREDENTIAL", item_id: body.itemId } : await exchangePlaidPublicToken(body.publicToken);
    const numbers = simulated ? { accountNumber: "0000000001", routingNumber: "021000021", accountMask: body.accountMask ?? "4821", accountName: body.institutionName ?? "Demo bank" } : await getPlaidAchNumbers(plaid.access_token);
    const encryptNumber = (value: string) => simulated ? `SIMULATED:${Buffer.from(value).toString("base64url")}` : encryptPlaidAccessToken(value);
    const { data, error } = await client.from("linked_funding_accounts").upsert({ business_id: context.businessId, account_id: context.accountId, provider: "PLAID", provider_item_id: plaid.item_id, encrypted_access_token: simulated ? "SIMULATED_ENCRYPTED_TOKEN" : encryptPlaidAccessToken(plaid.access_token), encrypted_account_number: encryptNumber(numbers.accountNumber), encrypted_routing_number: encryptNumber(numbers.routingNumber), institution_name: numbers.accountName, account_mask: numbers.accountMask, status: "LINKED" }, { onConflict: "provider,provider_item_id" }).select("id,institution_name,account_mask,status").single();
    if (error) throw error;
    return NextResponse.json({ mode: simulated ? "SIMULATED" : "LIVE", account: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to link funding account" }, { status: 400 });
  }
}
