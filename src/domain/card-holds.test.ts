import { describe, expect, it } from "vitest";
import { mergeHoldState, type HoldState } from "./card-holds";

describe("mergeHoldState", () => {
  it("never reactivates a released hold", () => {
    const released: HoldState = { amountCents: 5_000, status: "RELEASED" };
    expect(mergeHoldState(released, { amountCents: 5_000, status: "ACTIVE" })).toEqual(released);
  });

  it("allows the one-way active to released transition", () => {
    expect(mergeHoldState({ amountCents: 5_000, status: "ACTIVE" }, { amountCents: 5_000, status: "RELEASED" })).toEqual({ amountCents: 5_000, status: "RELEASED" });
  });
});
