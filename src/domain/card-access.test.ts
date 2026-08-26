import { describe, expect, it } from "vitest";
import { canViewCard, filterVisibleCards } from "./card-access";

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

describe("filterVisibleCards", () => {
  const cards = [
    { cardToken: "assigned-to-current-member", memberId: "employee" },
    { cardToken: "assigned-to-someone-else", memberId: "other" },
    { cardToken: "unassigned", memberId: null },
  ];

  it("returns every business card for an admin", () => {
    expect(filterVisibleCards(cards, { role: "ADMIN", currentMemberId: "admin" })).toEqual(cards);
  });

  it("returns only cards assigned to the current member", () => {
    expect(filterVisibleCards(cards, { role: "MEMBER", currentMemberId: "employee" })).toEqual([
      { cardToken: "assigned-to-current-member", memberId: "employee" },
    ]);
  });
});
