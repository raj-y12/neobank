import { listLithicCards } from "@/src/integrations/lithic/client";
import { CardTile } from "./CardTile";
import { IssueCardButton } from "./IssueCardButton";

export const dynamic = "force-dynamic";

export default async function CardsPage() {
  const cards = await listLithicCards();

  return (
    <>
      <section className="intro">
        <div><p className="eyebrow">Cards · Lithic sandbox</p><h2>Your team cards.</h2><p className="intro-copy">Live card inventory from the issuer processor. Open a card to see the activity Lithic has recorded for it.</p></div>
        <IssueCardButton />
      </section>
      {cards.length === 0 ? (
        <section className="panel" style={{ marginTop: 14 }}>
          <div className="empty-state"><h4>No cards in Lithic yet</h4><p>Create a sandbox card to see it appear here.</p></div>
        </section>
      ) : (
        <section className="card-tile-grid" style={{ marginTop: 14 }} aria-label="Issued cards">
          {cards.map((card) => <CardTile card={card} href={`/cards/${card.token}`} key={card.token} />)}
        </section>
      )}
      <footer className="footer"><span>{cards.length} live sandbox card{cards.length === 1 ? "" : "s"}</span><span>Lithic</span></footer>
    </>
  );
}
