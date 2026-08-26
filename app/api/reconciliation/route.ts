import { NextResponse } from "next/server";
import { diffReconciliation, journalRowsForTransfers, parseReconciliationCsv, type ReconciliationProviderRow } from "@/src/domain/reconciliation";
import { getAuthenticatedScope } from "@/src/lib/auth-scope";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const context = await getAuthenticatedScope();
    if (context.role !== "ADMIN") return NextResponse.json({ error: "ADMIN role required" }, { status: 403 });
    const isCsv = request.headers.get("content-type")?.includes("text/csv");
    const fileReference = request.headers.get("x-file-reference") ?? undefined;
    const body = isCsv ? null : await request.json() as { fileReference?: string; providerRows?: ReconciliationProviderRow[] };
    const reference = fileReference ?? body?.fileReference;
    if (!reference) throw new Error("fileReference is required");
    const providerRows = isCsv ? parseReconciliationCsv(await request.text()) : body?.providerRows;
    if (!providerRows) throw new Error("providerRows are required");
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Supabase reconciliation storage is not configured");
    const client = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: existingFile, error: existingFileError } = await client.from("reconciliation_files").select("id").eq("business_id", context.businessId).eq("provider", "INCREASE").eq("file_reference", reference).maybeSingle<{ id: string }>();
    if (existingFileError) throw existingFileError;
    let file = existingFile;
    if (!file) {
      const { data: createdFile, error: createFileError } = await client.from("reconciliation_files").insert({ business_id: context.businessId, provider: "INCREASE", file_reference: reference }).select("id").single<{ id: string }>();
      if (createFileError) {
        // Another reconciliation request may have created the same file after
        // the lookup. Re-read the scoped row before surfacing the error.
        if ((createFileError as { code?: string }).code !== "23505") throw createFileError;
        const { data: racedFile, error: racedFileError } = await client.from("reconciliation_files").select("id").eq("business_id", context.businessId).eq("provider", "INCREASE").eq("file_reference", reference).maybeSingle<{ id: string }>();
        if (racedFileError || !racedFile) throw racedFileError ?? new Error("Unable to create reconciliation file");
        file = racedFile;
      } else {
        file = createdFile;
      }
    }
    const [{ data: fundingRows, error: fundingError }, { data: paymentRows, error: paymentError }] = await Promise.all([
      client.from("funding_transfers").select("id,provider_transfer_id,status").eq("business_id", context.businessId).eq("status", "SETTLED"),
      client.from("payments").select("id,provider_payment_id,status").eq("business_id", context.businessId).eq("status", "SETTLED"),
    ]);
    if (fundingError) throw fundingError;
    if (paymentError) throw paymentError;
    const transferReferences = [
      ...(fundingRows ?? []).map((row) => row.id),
      ...(paymentRows ?? []).map((row) => row.id),
    ];
    const { data: journalEntries, error: journalError } = transferReferences.length
      ? await client.from("journal_entries").select("reference_id,entry_type,journal_postings(account_code,debit_cents,credit_cents)").eq("business_id", context.businessId).eq("account_id", context.accountId).in("reference_id", transferReferences)
      : { data: [], error: null };
    if (journalError) throw journalError;
    const internalRows = journalRowsForTransfers((journalEntries ?? []).map((row) => ({
      referenceId: row.reference_id as string | null,
      entryType: row.entry_type as string,
      postings: (row.journal_postings ?? []).map((posting) => ({ accountCode: posting.account_code, debitCents: posting.debit_cents, creditCents: posting.credit_cents })),
    })));
    const transferByInternalId = new Map([
      ...(fundingRows ?? []).filter((row) => row.provider_transfer_id).map((row) => [row.id, row.provider_transfer_id as string] as const),
      ...(paymentRows ?? []).filter((row) => row.provider_payment_id).map((row) => [row.id, row.provider_payment_id as string] as const),
    ]);
    const ledgerRows = internalRows.flatMap((row) => {
      const providerReference = transferByInternalId.get(row.referenceId);
      return providerReference ? [{ referenceId: providerReference, amountCents: row.amountCents }] : [];
    });
    const breaks = diffReconciliation(providerRows, ledgerRows);
    if (breaks.length) {
      const { data: existing, error: existingError } = await client.from("reconciliation_breaks").select("break_type,provider_reference").eq("file_id", file.id);
      if (existingError) throw existingError;
      const existingKeys = new Set((existing ?? []).map((item) => `${item.break_type}:${item.provider_reference}`));
      const newBreaks = breaks.filter((item) => !existingKeys.has(`${item.breakType}:${item.providerReference}`));
      const { error } = newBreaks.length ? await client.from("reconciliation_breaks").insert(newBreaks.map((item) => ({ business_id: context.businessId, file_id: file.id, break_type: item.breakType, provider_reference: item.providerReference, ledger_reference: item.ledgerReference ?? null, expected_amount_cents: item.expectedAmountCents ?? null, actual_amount_cents: item.actualAmountCents ?? null }))) : { error: null };
      if (error) throw error;
    }
    return NextResponse.json({ fileId: file.id, breakCount: breaks.length, breaks, source: isCsv ? "increase_csv" : "normalized_rows" }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to reconcile file" }, { status: 400 });
  }
}
