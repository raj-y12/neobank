import type { MembershipRole } from "./auth";

export function canIssueCards(role: MembershipRole) {
  return role === "ADMIN";
}

export function canViewCard(input: { role: MembershipRole; currentMemberId: string; assignedMemberId: string | null }) {
  return input.role === "ADMIN" || input.assignedMemberId === input.currentMemberId;
}

export function filterVisibleCards<T extends { memberId: string | null }>(
  cards: T[],
  viewer: { role: MembershipRole; currentMemberId: string },
) {
  return cards.filter((card) => canViewCard({ ...viewer, assignedMemberId: card.memberId }));
}

export function employeeEmailForCard(
  assignments: Array<{ cardToken: string; employeeEmail: string | null; memberId?: string | null }>,
  cardToken: string,
) {
  return assignments.find((assignment) => assignment.cardToken === cardToken)?.employeeEmail ?? null;
}
