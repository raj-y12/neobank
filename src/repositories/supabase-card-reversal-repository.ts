import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { validateReturnLink, type CardReversalIntent } from "../domain/card-reversal";
import type { CardReversalRepository } from "./card-reversal-repository";

type IntentRow = {
  id: string;
  original_transaction_id: string;
  card_token: string;
  expected_amount_cents: number;
  provider_return_transaction_id: string | null;
  status: CardReversalIntent["status"];
  idempotency_key: string;
};

function toIntent(row: IntentRow): CardReversalIntent {
  return {
    id: row.id,
    originalTransactionId: row.original_transaction_id,
    cardToken: row.card_token,
    expectedAmountCents: row.expected_amount_cents,
    providerReturnTransactionId: row.provider_return_transaction_id,
    status: row.status,
    idempotencyKey: row.idempotency_key,
  };
}

export class SupabaseCardReversalRepository implements CardReversalRepository {
  constructor(private readonly client: SupabaseClient) {}

  async createIntent(input: { originalTransactionId: string; idempotencyKey: string }) {
    const { data: original, error: originalError } = await this.client
      .from("card_transactions")
      .select("card_token,status,settled_amount_cents")
      .eq("id", input.originalTransactionId)
      .single<{ card_token: string; status: string; settled_amount_cents: number | null }>();

    if (originalError) throw originalError;
    if (original.status !== "SETTLED" || !original.settled_amount_cents || original.settled_amount_cents <= 0) {
      throw new Error("Only settled transactions can be reversed");
    }

    const { data, error } = await this.client
      .from("card_reversal_intents")
      .insert({
        original_transaction_id: input.originalTransactionId,
        card_token: original.card_token,
        expected_amount_cents: original.settled_amount_cents,
        status: "PENDING",
        idempotency_key: input.idempotencyKey,
      })
      .select("id,original_transaction_id,card_token,expected_amount_cents,provider_return_transaction_id,status,idempotency_key")
      .single<IntentRow>();

    if (error?.code === "23505") {
      const { data: existing, error: existingError } = await this.client
        .from("card_reversal_intents")
        .select("id,original_transaction_id,card_token,expected_amount_cents,provider_return_transaction_id,status,idempotency_key")
        .eq("idempotency_key", input.idempotencyKey)
        .single<IntentRow>();
      if (existingError) throw existingError;
      return toIntent(existing);
    }
    if (error) throw error;
    return toIntent(data);
  }

  async linkReturn(input: { intentId: string; providerReturnTransactionId: string; returnCardToken: string; returnAmountCents: number }) {
    const { data, error } = await this.client
      .from("card_reversal_intents")
      .select("id,original_transaction_id,card_token,expected_amount_cents,provider_return_transaction_id,status,idempotency_key")
      .eq("id", input.intentId)
      .single<IntentRow>();
    if (error) throw error;

    const intent = toIntent(data);
    validateReturnLink({ intent, returnCardToken: input.returnCardToken, returnAmountCents: input.returnAmountCents });

    const { data: linked, error: linkError } = await this.client
      .from("card_reversal_intents")
      .update({
        provider_return_transaction_id: input.providerReturnTransactionId,
        status: "LINKED",
        linked_at: new Date().toISOString(),
      })
      .eq("id", input.intentId)
      .eq("status", "PENDING")
      .select("id,original_transaction_id,card_token,expected_amount_cents,provider_return_transaction_id,status,idempotency_key")
      .single<IntentRow>();
    if (linkError) throw linkError;
    return toIntent(linked);
  }

  async getIntent(intentId: string) {
    const { data, error } = await this.client
      .from("card_reversal_intents")
      .select("id,original_transaction_id,card_token,expected_amount_cents,provider_return_transaction_id,status,idempotency_key")
      .eq("id", intentId)
      .single<IntentRow>();
    if (error) throw error;
    return toIntent(data);
  }

  async findByProviderReturnTransactionId(providerReturnTransactionId: string) {
    const { data, error } = await this.client
      .from("card_reversal_intents")
      .select("id,original_transaction_id,card_token,expected_amount_cents,provider_return_transaction_id,status,idempotency_key")
      .eq("provider_return_transaction_id", providerReturnTransactionId)
      .maybeSingle<IntentRow>();
    if (error) throw error;
    return data ? toIntent(data) : null;
  }

  async markPosted(intentId: string) {
    const { error } = await this.client
      .from("card_reversal_intents")
      .update({ status: "POSTED", posted_at: new Date().toISOString() })
      .eq("id", intentId)
      .in("status", ["LINKED", "POSTED"]);
    if (error) throw error;
  }
}

export function createSupabaseCardReversalRepository() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error("Supabase card reversal storage is not configured");
  return new SupabaseCardReversalRepository(createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } }));
}
