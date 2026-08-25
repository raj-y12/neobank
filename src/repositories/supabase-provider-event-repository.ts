import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  ProviderEventInsertResult,
  ProviderEventRecord,
  ProviderEventRepository,
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
