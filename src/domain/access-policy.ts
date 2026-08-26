import type { MembershipRole } from "./auth";

export type NavigationItem = { href: string; label: string };

const ADMIN_ONLY_PREFIXES = ["/team", "/funding", "/statements", "/reconciliation", "/standing-orders"] as const;
const ADMIN_NAVIGATION: NavigationItem[] = [
  { href: "/", label: "Overview" },
  { href: "/cards", label: "Cards" },
  { href: "/team", label: "Employees" },
  { href: "/payments", label: "Payments" },
  { href: "/approvals", label: "Approvals" },
  { href: "/standing-orders", label: "Standing orders" },
  { href: "/reconciliation", label: "Reconciliation" },
];
const MEMBER_NAVIGATION: NavigationItem[] = [
  { href: "/", label: "Overview" },
  { href: "/cards", label: "Cards" },
  { href: "/payments", label: "Send money" },
  { href: "/approvals", label: "My requests" },
];

export function canAccessPage(role: MembershipRole, pathname: string) {
  return role === "ADMIN" || !ADMIN_ONLY_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function navigationForRole(role: MembershipRole) {
  return role === "ADMIN" ? ADMIN_NAVIGATION : MEMBER_NAVIGATION;
}

export function canViewBusinessFinancials(role: MembershipRole) { return role === "ADMIN"; }
export function canManageBusiness(role: MembershipRole) { return role === "ADMIN"; }
