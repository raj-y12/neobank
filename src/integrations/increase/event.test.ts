import { describe, expect, it } from "vitest";
import { normalizeAchTransferEvent } from "./event";

describe("normalizeAchTransferEvent", () => {
  it("uses Increase's associated object identifier", () => {
    expect(normalizeAchTransferEvent({
      id: "event_1",
      category: "ach_transfer.updated",
      associated_object_type: "ach_transfer",
      associated_object_id: "ach_transfer_1",
      type: "event",
    }, { id: "ach_transfer_1", status: "submitted", settlement: { settled_at: "2026-08-25T18:00:00Z" } })).toEqual({
      providerEventId: "event_1",
      providerTransferId: "ach_transfer_1",
      status: "SETTLED",
    });
  });

  it("maps a returned transfer and ignores unrelated events", () => {
    expect(normalizeAchTransferEvent({ id: "event_2", category: "ach_transfer.updated", associated_object_type: "ach_transfer", associated_object_id: "ach_transfer_2" }, { id: "ach_transfer_2", status: "returned" })?.status).toBe("RETURNED");
    expect(normalizeAchTransferEvent({ id: "event_3", category: "transaction.created", associated_object_type: "transaction", associated_object_id: "transaction_1" }, null)).toBeNull();
  });

  it("reports submitted before settlement", () => {
    expect(normalizeAchTransferEvent({ id: "event_4", category: "ach_transfer.updated", associated_object_type: "ach_transfer", associated_object_id: "ach_transfer_4" }, { id: "ach_transfer_4", status: "submitted" })).toEqual({
      providerEventId: "event_4",
      providerTransferId: "ach_transfer_4",
      status: "SUBMITTED",
    });
  });
});
