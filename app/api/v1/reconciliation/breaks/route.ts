import { createClient } from "@supabase/supabase-js";
import { ageBucket } from "@/src/domain/reconciliation";
import { getPublicApiScope, publicApiError } from "@/src/lib/public-api-auth";

export async function GET(request: Request) {
  try {
    const scope = await getPublicApiScope(request);
    if (scope.role !== "ADMIN") return Response.json({ error: "ADMIN role required", code: "forbidden" }, { status: 403 });
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Supabase reconciliation storage is not configured");
    const { data, error } = await createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } }).from("reconciliation_breaks").select("id,break_type,provider_reference,expected_amount_cents,actual_amount_cents,status,created_at").eq("business_id", scope.businessId).order("created_at", { ascending: false });
    if (error) throw error;
    return Response.json({ businessId: scope.businessId, breaks: (data ?? []).map((row) => ({ ...row, ageBucket: ageBucket(row.created_at) })) });
  } catch (error) { return publicApiError(error, "Unable to load reconciliation breaks"); }
}
