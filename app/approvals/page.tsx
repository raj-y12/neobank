import { getAuthenticatedScope } from "@/src/lib/auth-scope";
import ApprovalsClient from "./ApprovalsClient";

export default async function ApprovalsPage() {
  const scope = await getAuthenticatedScope();
  return <ApprovalsClient role={scope.role} />;
}
