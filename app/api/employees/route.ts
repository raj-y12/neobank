import { NextResponse } from "next/server";
import { validateEmployeeInvite } from "@/src/domain/team";
import { getAuthenticatedScope } from "@/src/lib/auth-scope";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

export async function GET() {
  try {
    const scope = await getAuthenticatedScope();
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.from("business_members").select("id,email,role,status").eq("business_id", scope.businessId).order("created_at", { ascending: true });
    if (error) throw error;
    return NextResponse.json({ employees: data ?? [] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load employees" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  let createdUserId: string | null = null;
  try {
    const scope = await getAuthenticatedScope();
    if (scope.role !== "ADMIN") return NextResponse.json({ error: "ADMIN role required" }, { status: 403 });
    const input = validateEmployeeInvite(await request.json() as { email?: string; role?: string });
    const admin = createSupabaseAdminClient();
    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(input.email);
    if (inviteError || !invited.user) throw inviteError ?? new Error("Unable to invite employee");
    createdUserId = invited.user.id;
    const memberId = `member-${crypto.randomUUID()}`;
    const { error: memberError } = await admin.from("business_members").insert({ id: memberId, business_id: scope.businessId, auth_user_id: createdUserId, email: input.email, role: input.role, status: "INVITED" });
    if (memberError) throw memberError;
    const { error: membershipError } = await admin.from("business_memberships").insert({ user_id: createdUserId, business_id: scope.businessId, account_id: scope.accountId, role: input.role });
    if (membershipError) throw membershipError;
    return NextResponse.json({ employee: { id: memberId, email: input.email, role: input.role, status: "INVITED" } }, { status: 201 });
  } catch (error) {
    if (createdUserId) {
      try { await createSupabaseAdminClient().auth.admin.deleteUser(createdUserId); } catch { /* best-effort rollback */ }
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to invite employee" }, { status: 400 });
  }
}
