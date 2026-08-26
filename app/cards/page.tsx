import { listLithicCards } from "@/src/integrations/lithic/client";
import { getAuthenticatedScope } from "@/src/lib/auth-scope";
import { listBusinessCardAssignments } from "@/src/repositories/supabase-business-card-repository";
import { employeeEmailForCard, filterVisibleCards } from "@/src/domain/card-access";
import { CardTile } from "./CardTile";
import { IssueCardButton } from "./IssueCardButton";

export const dynamic = "force-dynamic";

export default async function CardsPage() {
  const scope = await getAuthenticatedScope();
  const [providerCards, assignments] = await Promise.all([
    listLithicCards(),
    listBusinessCardAssignments(scope.businessId),
  ]);
  const visibleAssignments = filterVisibleCards(assignments, { role: scope.role, currentMemberId: scope.memberId });
  const assignmentByToken = new Map(visibleAssignments.map((assignment) => [assignment.cardToken, assignment]));
  const cards = providerCards.filter((card) => assignmentByToken.has(card.token));
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
          {cards.map((card) => { const assignment = visibleAssignments.find((item) => item.cardToken === card.token); return <CardTile key={card.token} card={card} href={`/cards/${card.token}`} delegatedTo={assignment?.employeeName ?? employeeEmailForCard(visibleAssignments, card.token)} cardColor={assignment?.cardColor} />; })}
        </section>
      )}
    </>
  );
}
