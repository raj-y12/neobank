import type { MembershipRole } from "./auth";

export function canViewCard(input: { role: MembershipRole; currentMemberId: string; assignedMemberId: string | null }) {
  return input.role === "ADMIN" || input.assignedMemberId === input.currentMemberId;
}

export function filterVisibleCards<T extends { memberId: string | null }>(
  cards: T[],
  viewer: { role: MembershipRole; currentMemberId: string },
) {
  return cards.filter((card) => canViewCard({ ...viewer, assignedMemberId: card.memberId }));
}
