import type { MembershipRole } from "./auth";

export function canViewCard(input: { role: MembershipRole; currentMemberId: string; assignedMemberId: string | null }) {
  return input.role === "ADMIN" || input.assignedMemberId === input.currentMemberId;
}
