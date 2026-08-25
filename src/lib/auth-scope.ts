import { assertMembershipRole, type MembershipRole } from "../domain/auth";
import { createServerSupabaseClient } from "./supabase/server";
import { createClient } from "@supabase/supabase-js";

type AuthClaims = { sub: string; email?: unknown };
type MembershipRow = { user_id: string; business_id: string; account_id: string; role: string };
type PaymentMemberRow = { id: string; business_id: string; auth_user_id: string | null };

export type AuthenticatedScope = { userId: string; memberId: string; businessId: string; accountId: string; role: MembershipRole; email?: string };

export function assembleAuthenticatedScope(claims: AuthClaims, membership: MembershipRow, member: PaymentMemberRow | null): AuthenticatedScope {
  if (membership.user_id !== claims.sub || !member || member.auth_user_id !== claims.sub || member.business_id !== membership.business_id) {
    throw new Error("No payment member is assigned to this authenticated business user");
  }
  return {
    userId: claims.sub,
    memberId: member.id,
    businessId: membership.business_id,
    accountId: membership.account_id,
    role: assertMembershipRole(membership.role),
    email: typeof claims.email === "string" ? claims.email : undefined,
  };
}

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
    .maybeSingle<MembershipRow>();
  if (membershipError) throw membershipError;
  if (!membership) throw new Error("No business membership is assigned to this user");
  const { data: member, error: memberError } = await admin
    .from("business_members")
    .select("id,business_id,auth_user_id")
    .eq("business_id", membership.business_id)
    .eq("auth_user_id", userId)
    .maybeSingle<PaymentMemberRow>();
  if (memberError) throw memberError;
  return assembleAuthenticatedScope({ sub: userId, email: data.claims.email }, membership, member);
}
