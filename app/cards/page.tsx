import Link from "next/link";
import { formatLithicDate, formatUsdCents, listLithicCards } from "@/src/integrations/lithic/client";

export const dynamic = "force-dynamic";

export default async function CardsPage() {
  const cards = await listLithicCards();

  return (
    <>
      <section className="intro">
        <div><p className="eyebrow">Cards · Lithic sandbox</p><h2>Your team cards.</h2><p className="intro-copy">Live card inventory from the issuer processor. Open a card to see the activity Lithic has recorded for it.</p></div>
        <button className="btn btn-primary" disabled>Issue card</button>
      </section>
      <section className="panel" style={{ marginTop: 14 }}>
        <div className="panel-heading"><div><p className="eyebrow">Issued cards</p><h3>Team cards</h3></div><span className="chip chip-neutral">{cards.length} card{cards.length === 1 ? "" : "s"}</span></div>
        {cards.length === 0 ? <div className="empty-state"><h4>No cards in Lithic yet</h4><p>Create a sandbox card to see it appear here.</p></div> : cards.map((card) => (
          <Link className="list-row" href={`/cards/${card.token}`} key={card.token}>
            <div className="list-icon is-blue">▣</div>
            <div><p className="list-title">{card.type} card ····{card.last_four}</p><p className="list-meta">Created {formatLithicDate(card.created)}</p></div>
            <div><p className="list-value">{card.state}</p><p className="list-sub">{formatUsdCents(card.spend_limit)} / {card.spend_limit_duration?.toLowerCase() ?? "—"}</p></div>
          </Link>
        ))}
      </section>
      <footer className="footer"><span>{cards.length} live sandbox card{cards.length === 1 ? "" : "s"}</span><span>Lithic</span></footer>
    </>
  );
}
