import { assertMembershipRole, type MembershipRole } from "@/src/domain/auth";
import { createServerSupabaseClient } from "@/src/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

export type AuthenticatedScope = { userId: string; businessId: string; accountId: string; role: MembershipRole; email?: string };

export async function getAuthenticatedScope(): Promise<AuthenticatedScope> {
  const authClient = await createServerSupabaseClient();
  const { data, error } = await authClient.auth.getClaims();
  if (error || !data?.claims?.sub) throw new Error("Authentication required");
  const userId = String(data.claims.sub);
  const admin = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { data: membership, error: membershipError } = await admin
    .from("business_memberships")
    .select("user_id,business_id,account_id,role")
    .eq("user_id", userId)
    .maybeSingle<{ user_id: string; business_id: string; account_id: string; role: string }>();
  if (membershipError) throw membershipError;
  if (!membership) throw new Error("No business membership is assigned to this user");
  return {
    userId,
    businessId: membership.business_id,
    accountId: membership.account_id,
    role: assertMembershipRole(membership.role),
    email: typeof data.claims.email === "string" ? data.claims.email : undefined,
  };
}
