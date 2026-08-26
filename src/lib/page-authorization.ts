import { redirect } from "next/navigation";
import type { AuthenticatedScope } from "./auth-scope";
import { canAccessPage } from "../domain/access-policy";

export function requirePageAccess(scope: AuthenticatedScope, pathname: string) {
  if (!canAccessPage(scope.role, pathname)) redirect("/");
}
