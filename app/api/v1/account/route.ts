import { createClient } from "@supabase/supabase-js";
import { createSupabaseLedgerRepository } from "@/src/repositories/supabase-ledger-repository";
import { getPublicApiScope, publicApiError } from "@/src/lib/public-api-auth";

export async function GET(request: Request) {
  try {
    const scope = await getPublicApiScope(request);
    if (scope.role !== "ADMIN") return Response.json({ error: "ADMIN role required", code: "forbidden" }, { status: 403 });
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Supabase account storage is not configured");
    const client = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
    const [{ data: business, error: businessError }, balances] = await Promise.all([
      client.from("businesses").select("id,legal_name,status").eq("id", scope.businessId).single(),
      createSupabaseLedgerRepository().getBalances({ businessId: scope.businessId, accountId: scope.accountId }),
    ]);
    if (businessError) throw businessError;
    return Response.json({ business, accountId: scope.accountId, currency: "USD", balances });
  } catch (error) { return publicApiError(error, "Unable to load account"); }
}
