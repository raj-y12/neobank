import Link from "next/link";
import { formatUsdCents, listLithicCards } from "@/src/integrations/lithic/client";

export const dynamic = "force-dynamic";

export default async function CardsPage() {
  const cards = await listLithicCards();

  return (
    <>
      <section className="intro">
        <div><p className="eyebrow">Cards · Lithic sandbox</p><h2>Your team cards.</h2><p className="intro-copy">Live card inventory from the issuer processor. Open a card to see the activity Lithic has recorded for it.</p></div>
        <button className="btn btn-primary" disabled>Issue card</button>
      </section>
      {cards.length === 0 ? (
        <section className="panel" style={{ marginTop: 14 }}>
          <div className="empty-state"><h4>No cards in Lithic yet</h4><p>Create a sandbox card to see it appear here.</p></div>
        </section>
      ) : (
        <section className="card-tile-grid" style={{ marginTop: 14 }} aria-label="Issued cards">
          {cards.map((card) => {
            const isActive = card.state === "OPEN";
            return (
              <Link
                className={`card-tile${isActive ? "" : " is-inactive"}`}
                href={`/cards/${card.token}`}
                key={card.token}
                aria-label={`${card.type} card ending ${card.last_four}, ${card.state.toLowerCase()}`}
              >
                <div className="card-tile-top">
                  <div className="card-chip" aria-hidden="true" />
                  <span className={`chip chip-on-dark${isActive ? "" : " is-muted"}`}>{card.state}</span>
                </div>
                <p className="card-tile-number tabular">•••• •••• •••• {card.last_four}</p>
                <div className="card-tile-bottom">
                  <div>
                    <p className="card-tile-kind">{card.type} card</p>
                    <p className="card-tile-brand">CORGI</p>
                  </div>
                  <p className="card-tile-limit">
                    Limit
                    <strong>{formatUsdCents(card.spend_limit)} / {card.spend_limit_duration?.toLowerCase() ?? "—"}</strong>
                  </p>
                </div>
              </Link>
            );
          })}
        </section>
      )}
      <footer className="footer"><span>{cards.length} live sandbox card{cards.length === 1 ? "" : "s"}</span><span>Lithic</span></footer>
    </>
  );
}
