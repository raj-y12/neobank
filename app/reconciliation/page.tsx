import { getAuthenticatedScope } from "@/src/lib/auth-scope";
import { requirePageAccess } from "@/src/lib/page-authorization";
import ReconciliationClient from "./ReconciliationClient";

export default async function ReconciliationPage() {
  const scope = await getAuthenticatedScope();
  requirePageAccess(scope, "/reconciliation");
  return <ReconciliationClient />;
}
