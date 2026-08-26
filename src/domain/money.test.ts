import { describe, expect, it } from "vitest";
import { dollarsToCents } from "./money";

describe("dollarsToCents", () => {
  it("converts display dollars to integer cents", () => {
    expect(dollarsToCents("1240.05")).toBe(124005);
    expect(dollarsToCents("$10")).toBe(1000);
  });

  it("rejects malformed or zero amounts", () => {
    expect(() => dollarsToCents("10.999")).toThrow();
    expect(() => dollarsToCents("0")).toThrow();
  });
});
