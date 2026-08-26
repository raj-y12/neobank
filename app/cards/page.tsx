import { listLithicCards } from "@/src/integrations/lithic/client";
import { getAuthenticatedScope } from "@/src/lib/auth-scope";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { listBusinessCardAssignments } from "@/src/repositories/supabase-business-card-repository";
import { CardTile } from "./CardTile";
import { CardDelegateForm } from "./CardDelegateForm";
import { IssueCardButton } from "./IssueCardButton";

export const dynamic = "force-dynamic";

export default async function CardsPage() {
  const scope = await getAuthenticatedScope();
  const [providerCards, assignments, employeesResult] = await Promise.all([
    listLithicCards(),
    listBusinessCardAssignments(scope.businessId),
    createSupabaseAdminClient().from("business_members").select("id,email,role,status").eq("business_id", scope.businessId).order("created_at", { ascending: true }),
  ]);
  const assignmentByToken = new Map(assignments.map((assignment) => [assignment.cardToken, assignment]));
  const cards = providerCards.filter((card) => assignmentByToken.has(card.token));
  const employees = employeesResult.data ?? [];

  return (
    <>
      <section className="intro">
        <div><h2>Cards</h2><p className="intro-copy">Manage cards issued to your team.</p></div>
        <IssueCardButton />
      </section>
      {cards.length === 0 ? (
        <section className="panel section-panel">
          <div className="empty-state"><h4>No cards yet</h4><p>Issue a card to get started.</p></div>
        </section>
      ) : (
        <section className="card-tile-grid section-panel" aria-label="Issued cards">
          {cards.map((card) => <div key={card.token}><CardTile card={card} href={`/cards/${card.token}`} /><CardDelegateForm cardToken={card.token} assignedMemberId={assignmentByToken.get(card.token)?.memberId ?? null} employees={employees} /></div>)}
        </section>
      )}
    </>
  );
}
