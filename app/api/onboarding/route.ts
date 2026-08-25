import { NextResponse } from "next/server";
import { contextFromHeaders } from "@/src/auth/authorization";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  try {
    const context = contextFromHeaders(request.headers);
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

export async function POST(request: Request) {
  try {
    const context = contextFromHeaders(request.headers);
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Supabase onboarding storage is not configured");
    const client = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
    const now = new Date().toISOString();
    const { error: businessError } = await client.from("businesses").upsert({ id: context.businessId, legal_name: "Northstar Labs, Inc.", status: "APPROVED", updated_at: now });
    if (businessError) throw businessError;
    const { error } = await client.from("onboarding_verifications").upsert([
      { business_id: context.businessId, provider: "PERSONA", provider_reference: `sim-business-${context.businessId}`, subject_type: "BUSINESS", status: "APPROVED", provider_updated_at: now, updated_at: now },
      { business_id: context.businessId, provider: "PERSONA", provider_reference: `sim-owner-${context.businessId}`, subject_type: "OWNER", status: "APPROVED", provider_updated_at: now, updated_at: now },
    ], { onConflict: "business_id,subject_type" });
    if (error) throw error;
    return NextResponse.json({ mode: "SIMULATED", status: "APPROVED" }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to start onboarding" }, { status: 400 });
  }
}
