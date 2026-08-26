import { describe, expect, it } from "vitest";
import { parseCardIssueInput } from "./card-issue";

describe("parseCardIssueInput", () => {
  it("normalizes an assigned card limit from dollars to cents", () => {
    expect(parseCardIssueInput({ memberId: "member-1", limit: "125.50", duration: "MONTHLY" })).toEqual({
      memberId: "member-1",
      spendLimit: 12550,
      spendLimitDuration: "MONTHLY",
    });
  });

  it("rejects missing assignees and invalid limits", () => {
    expect(() => parseCardIssueInput({ memberId: "", limit: "0", duration: "FOREVER" })).toThrow("Choose an employee");
    expect(() => parseCardIssueInput({ memberId: "member-1", limit: "12.345", duration: "FOREVER" })).toThrow("Limit must be a positive amount");
  });

  it("rejects unsupported durations", () => {
    expect(() => parseCardIssueInput({ memberId: "member-1", limit: "10", duration: "DAILY" })).toThrow("Unsupported limit duration");
  });
});
