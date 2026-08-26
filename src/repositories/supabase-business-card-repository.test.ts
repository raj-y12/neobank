import { describe, expect, it, vi } from "vitest";

const query = vi.hoisted(() => ({
  select: vi.fn(),
  in: vi.fn(),
  insert: vi.fn(),
}));

vi.mock("@/src/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => ({ from: () => query }),
}));

import { syncBusinessCards } from "./supabase-business-card-repository";

describe("syncBusinessCards", () => {
  it("does not reinsert a provider card already owned by another business", async () => {
    query.select.mockReturnValue(query);
    query.in.mockResolvedValue({ data: [{ card_token: "card-owned-elsewhere" }], error: null });
    query.insert.mockResolvedValue({ error: null });

    const created = await syncBusinessCards({ businessId: "business-a", cardTokens: ["card-owned-elsewhere"] });

    expect(created).toBe(0);
    expect(query.insert).not.toHaveBeenCalled();
  });
});
