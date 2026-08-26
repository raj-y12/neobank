import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

export type BusinessCardAssignment = {
  cardToken: string;
  memberId: string | null;
  status: "ASSIGNED" | "UNASSIGNED" | "DISABLED";
  employeeEmail: string | null;
  employeeName: string | null;
  cardColor: string | null;
};

export async function createBusinessCard(input: { businessId: string; cardToken: string; memberId: string; cardColor: string }) {
  const { error } = await createSupabaseAdminClient().from("business_cards").insert({ business_id: input.businessId, card_token: input.cardToken, member_id: input.memberId, card_color: input.cardColor, status: "ASSIGNED" });
  if (error) throw error;
}

export async function syncBusinessCards(input: { businessId: string; cardTokens: string[] }) {
  const admin = createSupabaseAdminClient();
  const tokens = [...new Set(input.cardTokens)];
  if (tokens.length === 0) return 0;
  // Card tokens are globally unique in the database. A provider card may be
  // visible to more than one business-level sync job, but it must only be
  // owned by the business that already has the row.
  const { data: existing, error: existingError } = await admin.from("business_cards").select("card_token").in("card_token", tokens);
  if (existingError) throw existingError;
  const existingTokens = new Set((existing ?? []).map((row) => row.card_token));
  const missing = tokens.filter((token) => !existingTokens.has(token));
  if (missing.length === 0) return 0;
  const { error } = await admin.from("business_cards").insert(missing.map((cardToken) => ({ business_id: input.businessId, card_token: cardToken, member_id: null, status: "UNASSIGNED", provider: "LITHIC" })));
  if (error) throw error;
  return missing.length;
}

export async function listBusinessCardAssignments(businessId: string): Promise<BusinessCardAssignment[]> {
  const { data, error } = await createSupabaseAdminClient().from("business_cards").select("card_token,member_id,status,card_color,business_members(first_name,last_name,email)").eq("business_id", businessId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => {
    const member = Array.isArray(row.business_members) ? row.business_members[0] : row.business_members;
    const employeeName = [member?.first_name, member?.last_name].filter(Boolean).join(" ") || null;
    return { cardToken: row.card_token, memberId: row.member_id, status: row.status, employeeEmail: member?.email ?? null, employeeName, cardColor: row.card_color ?? null } as BusinessCardAssignment;
  });
}

export async function getBusinessCardAssignment(businessId: string, cardToken: string) {
  const { data, error } = await createSupabaseAdminClient().from("business_cards").select("card_token,member_id,status,card_color,business_members(first_name,last_name,email)").eq("business_id", businessId).eq("card_token", cardToken).maybeSingle<{ card_token: string; member_id: string | null; status: BusinessCardAssignment["status"]; card_color: string | null; business_members: { first_name: string | null; last_name: string | null; email: string | null } | { first_name: string | null; last_name: string | null; email: string | null }[] | null }>();
  if (error) throw error;
  const member = Array.isArray(data?.business_members) ? data.business_members[0] : data?.business_members;
  const employeeName = [member?.first_name, member?.last_name].filter(Boolean).join(" ") || null;
  return data ? { cardToken: data.card_token, memberId: data.member_id, status: data.status, employeeEmail: member?.email ?? null, employeeName, cardColor: data.card_color ?? null } : null;
}

export async function delegateBusinessCard(input: { businessId: string; cardToken: string; memberId: string }) {
  const admin = createSupabaseAdminClient();
  const { data: member, error: memberError } = await admin.from("business_members").select("id").eq("id", input.memberId).eq("business_id", input.businessId).eq("status", "ACTIVE").maybeSingle();
  if (memberError) throw memberError;
  if (!member) throw new Error("Employee is not active in this business");
  const { data, error } = await admin.from("business_cards").update({ member_id: input.memberId, status: "ASSIGNED", updated_at: new Date().toISOString() }).eq("business_id", input.businessId).eq("card_token", input.cardToken).select("card_token,member_id,status").maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Card is not assigned to this business");
  return data;
}
