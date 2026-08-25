import { NextResponse } from "next/server";
import { validateSignupInput } from "@/src/domain/team";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

export async function POST(request: Request) {
  let createdUserId: string | null = null;
  try {
    const input = validateSignupInput(await request.json() as { email?: string; password?: string; legalName?: string });
    const admin = createSupabaseAdminClient();
    const { data: created, error: userError } = await admin.auth.admin.createUser({ email: input.email, password: input.password, email_confirm: true });
    if (userError || !created.user) throw userError ?? new Error("Unable to create login");
    createdUserId = created.user.id;
    const businessId = `business-${crypto.randomUUID()}`;
    const accountId = `account-${crypto.randomUUID()}`;
    const memberId = `member-${crypto.randomUUID()}`;
    const { error: businessError } = await admin.from("businesses").insert({ id: businessId, legal_name: input.legalName, status: "PENDING" });
    if (businessError) throw businessError;
    const { error: memberError } = await admin.from("business_members").insert({ id: memberId, business_id: businessId, auth_user_id: createdUserId, email: input.email, role: "ADMIN", status: "ACTIVE" });
    if (memberError) throw memberError;
    const { error: membershipError } = await admin.from("business_memberships").insert({ user_id: createdUserId, business_id: businessId, account_id: accountId, role: "ADMIN" });
    if (membershipError) throw membershipError;
    return NextResponse.json({ created: true, email: input.email, businessId }, { status: 201 });
  } catch (error) {
    if (createdUserId) {
      try { await createSupabaseAdminClient().auth.admin.deleteUser(createdUserId); } catch { /* best-effort rollback */ }
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create login" }, { status: 400 });
  }
}
