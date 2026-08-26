import { NextResponse } from "next/server";
import { getAuthenticatedScope } from "@/src/lib/auth-scope";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const context = await getAuthenticatedScope();
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Supabase onboarding storage is not configured");
    const client = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
    const [{ data: business, error: businessError }, { data: verifications, error: verificationError }] = await Promise.all([
      client.from("businesses").select("id,legal_name,status").eq("id", context.businessId).single(),
      client.from("onboarding_verifications").select("subject_type,status,provider,provider_reference,updated_at").eq("business_id", context.businessId).order("subject_type"),
    ]);
    if (businessError) throw businessError;
    if (verificationError) throw verificationError;
    return NextResponse.json({ business, verifications });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load onboarding" }, { status: 400 });
  }
}

export async function POST() {
  await getAuthenticatedScope();
  return NextResponse.json({ error: "Use /api/onboarding/persona to start provider verification" }, { status: 410 });
}
