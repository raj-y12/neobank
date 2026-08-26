import { describe, expect, it } from "vitest";
import { isUuid } from "./identifiers";

describe("identifiers", () => {
  it("accepts UUID resource ids and rejects malformed values", () => {
    expect(isUuid("00000000-0000-4000-8000-000000000000")).toBe(true);
    expect(isUuid("not-a-uuid")).toBe(false);
  });
});
