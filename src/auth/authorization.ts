export type BusinessContext = {
  businessId: string;
  accountId: string;
  memberId: string;
  role: "ADMIN" | "MEMBER";
};

export function contextFromHeaders(headers: Headers): BusinessContext {
  const businessId = headers.get("x-business-id");
  const accountId = headers.get("x-account-id");
  const memberId = headers.get("x-member-id");
  const role = headers.get("x-member-role");
  if (!businessId || !accountId || !memberId || (role !== "ADMIN" && role !== "MEMBER")) {
    throw new Error("Authenticated business context is required");
  }
  return { businessId, accountId, memberId, role };
}

export function requireAdmin(context: BusinessContext) {
  if (context.role !== "ADMIN") throw new Error("ADMIN role required");
}

export function assertBusinessScope(context: BusinessContext, businessId: string, accountId?: string) {
  if (context.businessId !== businessId || (accountId && context.accountId !== accountId)) {
    throw new Error("Record is outside the authenticated business scope");
  }
}
