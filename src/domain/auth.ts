export type MembershipRole = "ADMIN" | "MEMBER";

export function assertMembershipRole(value: string): MembershipRole {
  if (value === "ADMIN" || value === "MEMBER") return value;
  throw new Error("Invalid membership role");
}
