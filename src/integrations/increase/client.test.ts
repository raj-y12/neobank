import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IncreaseAchRail } from "./client";

describe("IncreaseAchRail sandbox lifecycle", () => {
  beforeEach(() => {
    process.env.INCREASE_API_KEY = "test-key";
    process.env.INCREASE_ACCOUNT_ID = "account_test";
    process.env.INCREASE_ENV = "sandbox";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("settles a pending transfer through the Increase simulation API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      id: "ach_transfer_1",
      status: "submitted",
      settlement: { settled_at: "2026-08-25T18:00:00Z" },
    }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await new IncreaseAchRail().simulateSettlement("ach_transfer_1");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://sandbox.increase.com/simulations/ach_transfers/ach_transfer_1/settle",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ inbound_funds_hold_behavior: "release_immediately" }) }),
    );
    expect(result.status).toBe("SETTLED");
  });

  it("submits before simulating a return", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "ach_transfer_1", status: "pending_submission" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "ach_transfer_1", status: "submitted" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "ach_transfer_1", status: "returned" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await new IncreaseAchRail().simulateReturn("ach_transfer_1");

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "https://sandbox.increase.com/ach_transfers/ach_transfer_1",
      "https://sandbox.increase.com/simulations/ach_transfers/ach_transfer_1/submit",
      "https://sandbox.increase.com/simulations/ach_transfers/ach_transfer_1/return",
    ]);
    expect(result.status).toBe("RETURNED");
  });

  it("uses the scoped Increase account number for add money", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "ach_transfer_inbound", status: "pending_submission" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await new IncreaseAchRail().createInbound({ amountCents: 50_000, idempotencyKey: "funding-test", accountNumberId: "account_number_1" });

    expect(fetchMock).toHaveBeenLastCalledWith("https://sandbox.increase.com/simulations/inbound_ach_transfers", expect.objectContaining({ body: JSON.stringify({ account_number_id: "account_number_1", amount: 50000 }) }));
  });
});
