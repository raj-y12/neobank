import { createClient } from "@supabase/supabase-js";
import { assembleAuthenticatedScope, type AuthenticatedScope } from "./auth-scope";

export function getBearerToken(request: Request): string | null {
  const value = request.headers.get("authorization");
  if (!value) return null;
  const match = value.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export async function getPublicApiScope(request: Request): Promise<AuthenticatedScope> {
  const token = getBearerToken(request);
  if (!token) throw new Error("Bearer token required");
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase API configuration is not configured");
  const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new Error("Authentication required");
  const userId = data.user.id;
  const [{ data: membership, error: membershipError }, { data: member, error: memberError }] = await Promise.all([
    admin.from("business_memberships").select("user_id,business_id,account_id,role").eq("user_id", userId).maybeSingle(),
    admin.from("business_members").select("id,business_id,auth_user_id").eq("auth_user_id", userId).maybeSingle(),
  ]);
  if (membershipError) throw membershipError;
  if (memberError) throw memberError;
  if (!membership) throw new Error("No business membership is assigned to this user");
  return assembleAuthenticatedScope({ sub: userId, email: data.user.email }, membership, member);
}

export function publicApiError(error: unknown, fallback = "Request failed") {
  const message = error instanceof Error ? error.message : fallback;
  const status = /required|Authentication|membership|assigned/.test(message) ? 401 : 400;
  return Response.json({ error: message, code: status === 401 ? "unauthorized" : "bad_request" }, { status });
}
