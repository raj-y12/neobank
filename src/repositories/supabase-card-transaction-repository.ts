import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { InternalTransactionProjection } from "../domain/lithic-transaction-projection";
import { mergeHoldState } from "../domain/card-holds";
import type { CardTransactionRepository } from "./card-transaction-repository";

type TransactionRow = { id: string };
type EventRow = { id: string };

function transactionStatusRank(status: string) {
  if (status === "PENDING") return 1;
  if (status === "UNMATCHED_RETURN") return 2;
  return 3;
}

export class SupabaseCardTransactionRepository implements CardTransactionRepository {
  constructor(private readonly client: SupabaseClient) {}

  async project(projection: InternalTransactionProjection, payload: unknown) {
    const transaction = projection.transaction;
    const { data: existingTransaction, error: existingTransactionError } = await this.client
      .from("card_transactions")
      .select("id,status")
      .eq("provider", transaction.provider)
      .eq("provider_transaction_id", transaction.providerTransactionId)
      .maybeSingle<{ id: string; status: string }>();
    if (existingTransactionError) throw existingTransactionError;
    const mergedStatus = existingTransaction && transactionStatusRank(existingTransaction.status) > transactionStatusRank(transaction.status)
      ? existingTransaction.status
      : transaction.status;
    const { data: transactionRow, error: transactionError } = await this.client
      .from("card_transactions")
      .upsert({
        provider: transaction.provider,
        provider_transaction_id: transaction.providerTransactionId,
        card_token: transaction.cardToken,
        status: mergedStatus,
        authorization_amount_cents: transaction.authorizationAmountCents,
        settled_amount_cents: transaction.settledAmountCents,
        reversal_of_transaction_id: transaction.reversalOfTransactionId ?? null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "provider,provider_transaction_id" })
      .select("id")
      .single<TransactionRow>();

    if (transactionError) throw transactionError;

    const { data: eventRow, error: eventError } = await this.client
      .from("card_transaction_events")
      .insert({
        transaction_id: transactionRow.id,
        provider: transaction.provider,
        provider_event_id: projection.event.providerEventId,
        event_type: projection.event.eventType,
        occurred_at: projection.event.occurredAt,
        hold_amount_cents: projection.event.holdAmountCents,
        settlement_amount_cents: projection.event.settlementAmountCents,
        payload,
      })
      .select("id")
      .single<EventRow>();

    if (eventError?.code === "23505") return;
    if (eventError) throw eventError;

    if (projection.hold) {
      const { data: existingHold, error: existingHoldError } = await this.client
        .from("card_holds")
        .select("amount_cents,status,released_at,release_event_id")
        .eq("transaction_id", transactionRow.id)
        .maybeSingle<{ amount_cents: number; status: "ACTIVE" | "RELEASED"; released_at: string | null; release_event_id: string | null }>();
      if (existingHoldError) throw existingHoldError;
      const mergedHold = mergeHoldState(
        existingHold ? { amountCents: existingHold.amount_cents, status: existingHold.status } : null,
        { amountCents: projection.hold.amountCents, status: projection.hold.status },
      );
      const released = mergedHold.status === "RELEASED";
      const { error: holdError } = await this.client
        .from("card_holds")
        .upsert({
          transaction_id: transactionRow.id,
          amount_cents: mergedHold.amountCents,
          status: mergedHold.status,
          released_at: released ? existingHold?.released_at ?? new Date().toISOString() : null,
          release_event_id: released ? existingHold?.release_event_id ?? eventRow.id : null,
        }, { onConflict: "transaction_id" });

      if (holdError) throw holdError;
    }
  }
}

export function createSupabaseCardTransactionRepository() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error("Supabase card transaction storage is not configured");

  return new SupabaseCardTransactionRepository(
    createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } }),
  );
}
