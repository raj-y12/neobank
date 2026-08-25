import { describe, expect, it } from "vitest";
import { settlementReversalIdempotencyKey } from "./card-return";

describe("settlementReversalIdempotencyKey", () => {
  it("keeps unmatched posting and later linked replay on the same journal key", () => {
    const providerEventId = "return_event_1";
    expect(settlementReversalIdempotencyKey(providerEventId)).toBe("lithic:return_event_1:settlement-reversal");
    expect(settlementReversalIdempotencyKey(providerEventId)).toBe(settlementReversalIdempotencyKey(providerEventId));
  });
});
