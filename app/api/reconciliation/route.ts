import { NextResponse } from "next/server";
import { contextFromHeaders } from "@/src/auth/authorization";
import { diffReconciliation, type ReconciliationLedgerRow, type ReconciliationProviderRow } from "@/src/domain/reconciliation";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const context = contextFromHeaders(request.headers);
    const body = await request.json() as { fileReference?: string; providerRows?: ReconciliationProviderRow[]; ledgerRows?: ReconciliationLedgerRow[] };
    if (!body.fileReference || !body.providerRows || !body.ledgerRows) throw new Error("fileReference, providerRows, and ledgerRows are required");
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Supabase reconciliation storage is not configured");
    const client = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: file, error: fileError } = await client.from("reconciliation_files").upsert({ business_id: context.businessId, provider: "INCREASE", file_reference: body.fileReference }, { onConflict: "provider,file_reference" }).select("id").single();
    if (fileError) throw fileError;
    const breaks = diffReconciliation(body.providerRows, body.ledgerRows);
    if (breaks.length) {
      const { error } = await client.from("reconciliation_breaks").insert(breaks.map((item) => ({ business_id: context.businessId, file_id: file.id, break_type: item.breakType, provider_reference: item.providerReference, ledger_reference: item.ledgerReference ?? null, expected_amount_cents: item.expectedAmountCents ?? null, actual_amount_cents: item.actualAmountCents ?? null })));
      if (error) throw error;
    }
    return NextResponse.json({ fileId: file.id, breakCount: breaks.length, breaks }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to reconcile file" }, { status: 400 });
  }
}
