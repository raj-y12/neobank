import { redirect } from "next/navigation";
import { getAuthenticatedScope } from "@/src/lib/auth-scope";
import { requirePageAccess } from "@/src/lib/page-authorization";
import StandingOrdersClient from "./StandingOrdersClient";

export const dynamic = "force-dynamic";

export default async function StandingOrdersPage() {
  const scope = await getAuthenticatedScope();
  if (scope.role !== "ADMIN") redirect("/approvals");
  requirePageAccess(scope, "/standing-orders");
  return <StandingOrdersClient />;
}
