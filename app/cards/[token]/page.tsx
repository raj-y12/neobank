import Link from "next/link";
import { notFound } from "next/navigation";
import { formatLithicDate, formatUsdCents, getCardholderAmount, getLithicCard } from "@/src/integrations/lithic/client";
import { listInternalCardTransactions } from "@/src/repositories/supabase-card-transaction-reader";
import { TransactionActivity } from "./TransactionActivity";

export const dynamic = "force-dynamic";

export default async function CardDetailPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let card;
  try { card = await getLithicCard(token); } catch { notFound(); }
  const transactions = await listInternalCardTransactions(token);
  const recentTransactions = [...transactions].sort((a, b) => new Date(b.updated ?? b.created ?? 0).getTime() - new Date(a.updated ?? a.created ?? 0).getTime());
  const transactionRows = recentTransactions.map((transaction) => ({ ...transaction, displayAmount: getCardholderAmount(transaction) }));

  return (
    <>
      <section className="intro"><div><Link className="eyebrow" href="/cards">← Back to cards</Link><h2>{card.type} card ····{card.last_four}</h2><p className="intro-copy">Live details returned by Lithic for this sandbox card.</p></div><span className="pill pill-orange">{card.state}</span></section>
      <section className="metric-grid" aria-label="Card details">
        <article className="metric-card"><p className="card-label">Spend limit</p><p className="metric-value">{formatUsdCents(card.spend_limit)}</p><p className="card-detail">{card.spend_limit_duration?.toLowerCase() ?? "No duration"}</p></article>
        <article className="metric-card"><p className="card-label">Card type</p><p className="metric-value">{card.type}</p><p className="card-detail">{card.cardholder_currency ?? "USD"}</p></article>
        <article className="metric-card"><p className="card-label">Created</p><p className="metric-value metric-date">{formatLithicDate(card.created)}</p><p className="card-detail">Lithic sandbox</p></article>
      </section>
      <section className="panel" style={{ marginTop: 14 }}>
        <div className="panel-heading"><div><p className="eyebrow">Activity</p><h3>Recent transactions</h3></div><span className="chip chip-neutral">{recentTransactions.length} · click a row</span></div>
        <TransactionActivity transactions={transactionRows} />
      </section>
      <footer className="footer"><span>Live Lithic data</span><span>No fabricated activity</span></footer>
    </>
  );
}
