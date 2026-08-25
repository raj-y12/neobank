import { listLithicCards } from "@/src/integrations/lithic/client";
import { getAuthenticatedScope } from "@/src/lib/auth-scope";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { listBusinessCardAssignments } from "@/src/repositories/supabase-business-card-repository";
import { canViewCard } from "@/src/domain/card-access";
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
  const cards = providerCards.filter((card) => {
    const assignment = assignmentByToken.get(card.token);
    return assignment && canViewCard({ role: scope.role, currentMemberId: scope.memberId, assignedMemberId: assignment.memberId });
  });
  const employees = employeesResult.data ?? [];

  return (
    <>
      <section className="intro">
        <div><p className="eyebrow">Cards · Lithic sandbox</p><h2>Your team cards.</h2><p className="intro-copy">Live card inventory from the issuer processor. Open a card to see the activity Lithic has recorded for it.</p></div>
        <IssueCardButton />
      </section>
      {cards.length === 0 ? (
        <section className="panel" style={{ marginTop: 14 }}>
          <div className="empty-state"><h4>No cards available</h4><p>{scope.role === "ADMIN" ? "Sync existing cards or create a sandbox card to see it appear here." : "Your administrator has not delegated a card to you yet."}</p></div>
        </section>
      ) : (
        <section className="card-tile-grid" style={{ marginTop: 14 }} aria-label="Issued cards">
          {cards.map((card) => <div key={card.token}><CardTile card={card} href={`/cards/${card.token}`} /><CardDelegateForm cardToken={card.token} assignedMemberId={assignmentByToken.get(card.token)?.memberId ?? null} employees={employees} /></div>)}
        </section>
      )}
      <footer className="footer"><span>{cards.length} live sandbox card{cards.length === 1 ? "" : "s"}</span><span>Lithic</span></footer>
    </>
  );
}
