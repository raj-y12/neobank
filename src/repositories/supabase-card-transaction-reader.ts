import { createClient } from "@supabase/supabase-js";
import type { LithicTransaction } from "@/src/integrations/lithic/client";

export type InternalCardTransaction = LithicTransaction & {
  internalTransactionId: string;
  reversalOfTransactionId?: string;
};

type TransactionRow = {
  id: string;
  provider_transaction_id: string;
  card_token: string;
  status: string;
  authorization_amount_cents: number | null;
  settled_amount_cents: number | null;
  reversal_of_transaction_id: string | null;
  updated_at: string;
  card_transaction_events: Array<{
    occurred_at: string | null;
    created_at: string;
    payload: unknown;
  }>;
};

export async function listInternalCardTransactions(cardToken: string): Promise<InternalCardTransaction[]> {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error("Supabase card transaction storage is not configured");

  const client = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data, error } = await client
    .from("card_transactions")
    .select("id,provider_transaction_id,card_token,status,authorization_amount_cents,settled_amount_cents,reversal_of_transaction_id,updated_at,card_transaction_events(occurred_at,created_at,payload)")
    .eq("card_token", cardToken)
    .order("updated_at", { ascending: false });

  if (error) throw error;

  return ((data ?? []) as TransactionRow[]).map((row) => {
    const latestPayload = [...row.card_transaction_events]
      .sort((a, b) => new Date(b.occurred_at ?? 0).getTime() - new Date(a.occurred_at ?? 0).getTime() || new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map((event) => event.payload)
      .find((payload): payload is Record<string, unknown> => typeof payload === "object" && payload !== null);
    const payload = latestPayload ?? {};

    return {
      ...payload,
      token: row.provider_transaction_id,
      card_token: row.card_token,
      status: row.status,
      authorization_amount: row.authorization_amount_cents,
      settled_amount: row.settled_amount_cents,
      reversalOfTransactionId: row.reversal_of_transaction_id ?? undefined,
      amount: typeof payload.amount === "number" ? payload.amount : null,
      result: typeof payload.result === "string" ? payload.result : null,
      merchant_descriptor: typeof payload.merchant_descriptor === "string" ? payload.merchant_descriptor : null,
      merchant: typeof payload.merchant === "object" && payload.merchant !== null ? payload.merchant as LithicTransaction["merchant"] : null,
      created: typeof payload.created === "string" ? payload.created : row.updated_at,
      updated: row.updated_at,
      internalTransactionId: row.id,
    } as InternalCardTransaction;
  });
}
