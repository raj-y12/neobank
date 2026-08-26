import { TeamClient } from "./TeamClient";
import { getAuthenticatedScope } from "@/src/lib/auth-scope";
import { requirePageAccess } from "@/src/lib/page-authorization";

export default async function TeamPage() {
  const scope = await getAuthenticatedScope();
  requirePageAccess(scope, "/team");
  return (
    <>
      <section className="intro">
        <div>
          <h2>Employees</h2>
          <p className="muted">Invite employees to your business and choose whether they can approve payments or use delegated cards.</p>
        </div>
      </section>

      <TeamClient />
    </>
  );
}
