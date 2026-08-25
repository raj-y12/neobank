import { describe, expect, it } from "vitest";
import { canViewCard } from "./card-access";

describe("canViewCard", () => {
  it("allows admins to view every business card", () => {
    expect(canViewCard({ role: "ADMIN", currentMemberId: "admin", assignedMemberId: "employee" })).toBe(true);
  });

  it("allows a member to view only their assigned card", () => {
    expect(canViewCard({ role: "MEMBER", currentMemberId: "employee", assignedMemberId: "employee" })).toBe(true);
    expect(canViewCard({ role: "MEMBER", currentMemberId: "employee", assignedMemberId: "other" })).toBe(false);
    expect(canViewCard({ role: "MEMBER", currentMemberId: "employee", assignedMemberId: null })).toBe(false);
  });
});
