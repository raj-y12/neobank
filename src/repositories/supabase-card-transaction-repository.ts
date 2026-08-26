import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { PlannedLithicEvent } from "../domain/lithic-lifecycle";
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

  async projectLifecycle(event: PlannedLithicEvent) {
    const { data: existing, error: existingError } = await this.client.from("card_transactions")
      .select("id,status,authorization_amount_cents,settled_amount_cents")
      .eq("provider", "lithic").eq("provider_transaction_id", event.transactionId)
      .maybeSingle<{ id: string; status: string; authorization_amount_cents: number | null; settled_amount_cents: number | null }>();
    if (existingError) throw existingError;
    const mergedStatus = existing && transactionStatusRank(existing.status) > transactionStatusRank(event.transactionStatus) ? existing.status : event.transactionStatus;
    const authorizationAmountCents = event.type === "AUTHORIZATION" || event.type === "AUTHORIZATION_ADVICE"
      ? event.remainingHoldCents + event.cumulativeSettledCents
      : existing?.authorization_amount_cents ?? null;
    const { data: transaction, error: transactionError } = await this.client.from("card_transactions").upsert({
      provider: "lithic",
      provider_transaction_id: event.transactionId,
      card_token: event.cardToken,
      status: mergedStatus,
      authorization_amount_cents: authorizationAmountCents,
      settled_amount_cents: Math.max(existing?.settled_amount_cents ?? 0, event.cumulativeSettledCents),
      updated_at: new Date().toISOString(),
    }, { onConflict: "provider,provider_transaction_id" }).select("id").single<TransactionRow>();
    if (transactionError) throw transactionError;

    let { data: eventRow, error: eventError } = await this.client.from("card_transaction_events").insert({
      transaction_id: transaction.id,
      provider: "lithic",
      provider_event_id: event.semanticEventId,
      event_type: event.type,
      occurred_at: event.occurredAt,
      hold_amount_cents: event.remainingHoldCents,
      settlement_amount_cents: event.settlementDeltaCents,
      payload: event.providerPayload,
    }).select("id").single<EventRow>();
    if (eventError?.code === "23505") {
      const duplicate = await this.client.from("card_transaction_events").select("id")
        .eq("provider", "lithic").eq("provider_event_id", event.semanticEventId).single<EventRow>();
      if (duplicate.error) throw duplicate.error;
      eventRow = duplicate.data;
      eventError = null;
    }
    if (eventError) throw eventError;

    const { data: existingHold, error: holdReadError } = await this.client.from("card_holds")
      .select("amount_cents,status,released_at,release_event_id").eq("transaction_id", transaction.id)
      .maybeSingle<{ amount_cents: number; status: "ACTIVE" | "RELEASED"; released_at: string | null; release_event_id: string | null }>();
    if (holdReadError) throw holdReadError;
    if (event.remainingHoldCents > 0 || existingHold) {
      const incoming = { amountCents: event.remainingHoldCents || existingHold?.amount_cents || event.holdReleaseCents, status: event.remainingHoldCents > 0 ? "ACTIVE" as const : "RELEASED" as const };
      const merged = mergeHoldState(existingHold ? { amountCents: existingHold.amount_cents, status: existingHold.status } : null, incoming);
      const released = merged.status === "RELEASED";
      const { error: holdError } = await this.client.from("card_holds").upsert({
        transaction_id: transaction.id,
        amount_cents: merged.amountCents,
        status: merged.status,
        released_at: released ? existingHold?.released_at ?? new Date().toISOString() : null,
        release_event_id: released ? existingHold?.release_event_id ?? eventRow!.id : null,
      }, { onConflict: "transaction_id" });
      if (holdError) throw holdError;
    }
  }

  async findProviderTransactionId(transactionId: string) {
    const { data, error } = await this.client
      .from("card_transactions")
      .select("provider_transaction_id")
      .eq("id", transactionId)
      .maybeSingle<{ provider_transaction_id: string }>();
    if (error) throw error;
    return data?.provider_transaction_id ?? null;
  }

  async linkReversal(providerReturnTransactionId: string, originalTransactionId: string) {
    const { error } = await this.client.from("card_transactions")
      .update({ reversal_of_transaction_id: originalTransactionId })
      .eq("provider", "lithic")
      .eq("provider_transaction_id", providerReturnTransactionId);
    if (error) throw error;
  }

  async getLifecycleBaseline(providerTransactionId: string) {
    const { data: transaction, error } = await this.client.from("card_transactions")
      .select("id,authorization_amount_cents,settled_amount_cents")
      .eq("provider", "lithic").eq("provider_transaction_id", providerTransactionId)
      .maybeSingle<{ id: string; authorization_amount_cents: number | null; settled_amount_cents: number | null }>();
    if (error) throw error;
    if (!transaction) return { remainingHoldCents: 0, cumulativeSettledSigned: 0, hasAuthorization: false };
    const { data: hold, error: holdError } = await this.client.from("card_holds").select("amount_cents,status")
      .eq("transaction_id", transaction.id).maybeSingle<{ amount_cents: number; status: "ACTIVE" | "RELEASED" }>();
    if (holdError) throw holdError;
    const remainingHoldCents = hold?.status === "ACTIVE" ? hold.amount_cents : 0;
    return {
      remainingHoldCents,
      cumulativeSettledSigned: -(transaction.settled_amount_cents ?? 0),
      hasAuthorization: remainingHoldCents > 0 || Boolean(transaction.authorization_amount_cents),
    };
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
