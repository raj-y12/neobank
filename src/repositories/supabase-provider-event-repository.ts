import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  ProviderEventInsertResult,
  ProviderEventRecord,
  ProviderEventRepository,
  StoredProviderEvent,
} from "./provider-event-repository";

type ProviderEventRow = {
  provider: string;
  provider_event_id: string;
  event_type: string;
  payload: unknown;
};

export class SupabaseProviderEventRepository implements ProviderEventRepository {
  constructor(private readonly client: SupabaseClient) {}

  async insertIfNew(event: ProviderEventRecord): Promise<ProviderEventInsertResult> {
    const row: ProviderEventRow = {
      provider: event.provider,
      provider_event_id: event.providerEventId,
      event_type: event.eventType,
      payload: event.payload,
    };

    const { error } = await this.client.from("provider_events").insert(row);

    if (!error) return { inserted: true };
    if (error.code === "23505") return { inserted: false };
    throw error;
  }

  async listForTransaction(provider: string, providerTransactionId: string): Promise<StoredProviderEvent[]> {
    const { data, error } = await this.client
      .from("provider_events")
      .select("provider,provider_event_id,event_type,payload,received_at")
      .eq("provider", provider)
      .eq("payload->>token", providerTransactionId)
      .order("received_at", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((row) => ({
      provider: row.provider,
      providerEventId: row.provider_event_id,
      eventType: row.event_type,
      payload: row.payload,
      receivedAt: row.received_at,
    }));
  }

  async park(event: ProviderEventRecord & { providerTransactionId: string }) {
    const { error } = await this.client.from("card_event_parking").upsert({
      provider: event.provider,
      provider_event_id: event.providerEventId,
      provider_transaction_id: event.providerTransactionId,
      event_type: event.eventType,
      payload: event.payload,
    }, { onConflict: "provider,provider_event_id" });
    if (error) throw error;
  }

  async markMatched(provider: string, providerEventId: string) {
    const { error } = await this.client
      .from("card_event_parking")
      .update({ matched_at: new Date().toISOString() })
      .eq("provider", provider)
      .eq("provider_event_id", providerEventId)
      .is("matched_at", null);
    if (error) throw error;
  }
}

export function createSupabaseProviderEventRepository() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase provider event storage is not configured");
  }

  return new SupabaseProviderEventRepository(
    createClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    }),
  );
}
