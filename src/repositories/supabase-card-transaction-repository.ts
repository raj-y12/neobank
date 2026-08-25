import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { InternalTransactionProjection } from "@/src/domain/lithic-transaction-projection";
import type { CardTransactionRepository } from "./card-transaction-repository";

type TransactionRow = { id: string };
type EventRow = { id: string };

export class SupabaseCardTransactionRepository implements CardTransactionRepository {
  constructor(private readonly client: SupabaseClient) {}

  async project(projection: InternalTransactionProjection, payload: unknown) {
    const transaction = projection.transaction;
    const { data: transactionRow, error: transactionError } = await this.client
      .from("card_transactions")
      .upsert({
        provider: transaction.provider,
        provider_transaction_id: transaction.providerTransactionId,
        card_token: transaction.cardToken,
        status: transaction.status,
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
      const released = projection.hold.status === "RELEASED";
      const { error: holdError } = await this.client
        .from("card_holds")
        .upsert({
          transaction_id: transactionRow.id,
          amount_cents: projection.hold.amountCents,
          status: projection.hold.status,
          released_at: released ? new Date().toISOString() : null,
          release_event_id: released ? eventRow.id : null,
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
