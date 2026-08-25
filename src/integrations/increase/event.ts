import type { IncreaseAchTransfer } from "./client";

export type IncreaseEvent = {
  id?: string;
  category?: string;
  associated_object_type?: string;
  associated_object_id?: string;
  type?: string;
};

export function normalizeAchTransferEvent(event: IncreaseEvent, transfer: IncreaseAchTransfer | null) {
  if (event.associated_object_type !== "ach_transfer" || !event.associated_object_id || !transfer) return null;
  if (event.category !== "ach_transfer.created" && event.category !== "ach_transfer.updated") return null;
  const status = transfer.status === "returned" || transfer.status === "rejected" || transfer.status === "canceled"
    ? "RETURNED" as const
    : transfer.settlement?.settled_at
      ? "SETTLED" as const
      : transfer.status === "submitted"
        ? "SUBMITTED" as const
        : null;
  if (!status) return null;
  return {
    providerEventId: event.id,
    providerTransferId: event.associated_object_id,
    status,
  };
}
