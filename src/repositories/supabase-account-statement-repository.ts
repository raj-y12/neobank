import { createClient } from "@supabase/supabase-js";
import { projectAccountStatement, type AccountStatement } from "../domain/account-statement";
import type { LedgerScope } from "../domain/ledger-balance";
import { mapPersistedJournalRow, type AccountStatementRepository, type PersistedJournalRow, type StatementQuery } from "./account-statement-repository";

const JOURNAL_SELECT = "id,entry_type,value_date,booking_date,created_at,reference_id,reversal_of_reference_id,journal_postings(account_code,debit_cents,credit_cents)";

function configuredClient() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error("Supabase ledger storage is not configured");
  return createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

export class SupabaseAccountStatementRepository implements AccountStatementRepository {
  async getAccountStatement(scope: LedgerScope, query: StatementQuery): Promise<AccountStatement> {
    const client = configuredClient();
    let request = client.from("journal_entries")
      .select(JOURNAL_SELECT)
      .eq("business_id", scope.businessId)
      .eq("account_id", scope.accountId)
      .lte("value_date", query.statementEndDate ?? query.statementDate);
    if (query.asOfBookingTimestamp) request = request.lte("created_at", query.asOfBookingTimestamp);
    const { data, error } = await request;
    if (error) throw error;
    const entries = ((data ?? []) as PersistedJournalRow[]).map(mapPersistedJournalRow);
    return projectAccountStatement(entries, query);
  }

  async getLatestStatementDate(scope: LedgerScope) {
    const client = configuredClient();
    const { data, error } = await client.from("journal_entries")
      .select("value_date")
      .eq("business_id", scope.businessId)
      .eq("account_id", scope.accountId)
      .order("value_date", { ascending: false })
      .limit(1)
      .maybeSingle<{ value_date: string }>();
    if (error) throw error;
    return data?.value_date ?? null;
  }
}

export function createSupabaseAccountStatementRepository() {
  return new SupabaseAccountStatementRepository();
}
