import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const businessId = process.env.LEDGER_BUSINESS_ID ?? "demo-business";
const accountId = process.env.LEDGER_ACCOUNT_ID ?? "demo-account";
const adminEmail = process.env.DEMO_ADMIN_EMAIL;
const adminPassword = process.env.DEMO_ADMIN_PASSWORD;
const memberEmail = process.env.DEMO_MEMBER_EMAIL;
const memberPassword = process.env.DEMO_MEMBER_PASSWORD;

if (!url || !serviceRoleKey || !adminEmail || !adminPassword || !memberEmail || !memberPassword) {
  throw new Error("SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and all DEMO_* auth variables are required");
}

const supabase = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
const { data: users, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (listError) throw listError;

async function ensureUser(email, password) {
  const existing = users.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
  if (existing) return existing;
  const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw error ?? new Error(`Unable to create ${email}`);
  return data.user;
}

const admin = await ensureUser(adminEmail, adminPassword);
const member = await ensureUser(memberEmail, memberPassword);
const { error: membershipError } = await supabase.from("business_memberships").upsert([
  { user_id: admin.id, business_id: businessId, account_id: accountId, role: "ADMIN" },
  { user_id: member.id, business_id: businessId, account_id: accountId, role: "MEMBER" },
], { onConflict: "user_id,business_id" });
if (membershipError) throw membershipError;

console.log(`Seeded demo memberships for ${adminEmail} (ADMIN) and ${memberEmail} (MEMBER).`);
