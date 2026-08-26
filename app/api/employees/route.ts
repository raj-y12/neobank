import { NextResponse } from "next/server";
import { validateEmployeeInvite } from "@/src/domain/team";
import { getAuthenticatedScope } from "@/src/lib/auth-scope";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

export async function GET() {
  try {
    const scope = await getAuthenticatedScope();
    if (scope.role !== "ADMIN") return NextResponse.json({ error: "ADMIN role required" }, { status: 403 });
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.from("business_members").select("id,first_name,last_name,email,role,status").eq("business_id", scope.businessId).order("created_at", { ascending: true });
    if (error) throw error;
    return NextResponse.json({ employees: (data ?? []).map((employee) => ({ id: employee.id, firstName: employee.first_name, lastName: employee.last_name, email: employee.email, role: employee.role, status: employee.status })) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load employees" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  let createdUserId: string | null = null;
  try {
    const scope = await getAuthenticatedScope();
    if (scope.role !== "ADMIN") return NextResponse.json({ error: "ADMIN role required" }, { status: 403 });
    const input = validateEmployeeInvite(await request.json() as { firstName?: string; lastName?: string; email?: string; role?: string; password?: string });
    const admin = createSupabaseAdminClient();
    const { data: created, error: createError } = await admin.auth.admin.createUser({ email: input.email, password: input.password, email_confirm: true });
    if (createError || !created.user) throw createError ?? new Error("Unable to create employee login");
    createdUserId = created.user.id;
    const memberId = `member-${crypto.randomUUID()}`;
    const { error: memberError } = await admin.from("business_members").insert({ id: memberId, business_id: scope.businessId, auth_user_id: createdUserId, first_name: input.firstName, last_name: input.lastName, email: input.email, role: input.role, status: "ACTIVE" });
    if (memberError) throw memberError;
    const { error: membershipError } = await admin.from("business_memberships").insert({ user_id: createdUserId, business_id: scope.businessId, account_id: scope.accountId, role: input.role });
    if (membershipError) throw membershipError;
    return NextResponse.json({ employee: { id: memberId, firstName: input.firstName, lastName: input.lastName, email: input.email, role: input.role, status: "ACTIVE" }, initialPassword: input.password }, { status: 201 });
  } catch (error) {
    if (createdUserId) {
      try { await createSupabaseAdminClient().auth.admin.deleteUser(createdUserId); } catch { /* best-effort rollback */ }
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to invite employee" }, { status: 400 });
  }
}
