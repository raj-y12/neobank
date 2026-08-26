import { describe, expect, it } from "vitest";
import { canIssueCards, canViewCard, filterVisibleCards, employeeEmailForCard } from "./card-access";

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

describe("canIssueCards", () => {
  it("allows admins but not members to issue cards", () => {
    expect(canIssueCards("ADMIN")).toBe(true);
    expect(canIssueCards("MEMBER")).toBe(false);
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

describe("employeeEmailForCard", () => {
  it("returns the assigned employee email for a card token", () => {
    expect(employeeEmailForCard([
      { cardToken: "card-1", memberId: "member-1", employeeEmail: "owner@example.com" },
    ], "card-1")).toBe("owner@example.com");
  });

  it("returns null only when the card has no assignment or email", () => {
    expect(employeeEmailForCard([
      { cardToken: "card-1", memberId: "member-1", employeeEmail: null },
    ], "card-1")).toBeNull();
  });
});
