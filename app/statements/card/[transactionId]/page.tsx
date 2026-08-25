import Link from "next/link";
import { formatLithicDate, formatUsdCents } from "@/src/integrations/lithic/client";
import { getLedgerStatement } from "@/src/repositories/supabase-ledger-statement-repository";

export const dynamic = "force-dynamic";

export default async function CardStatementPage({ params }: { params: Promise<{ transactionId: string }> }) {
  const { transactionId } = await params;
  const rows = await getLedgerStatement(transactionId);

  return (
    <>
      <section className="intro"><div><Link className="back-link" href="/cards">← Cards</Link><h2>Card correction statement</h2><p className="intro-copy">Immutable journal activity for the customer account.</p></div><span className="pill pill-orange">BITEMPORAL</span></section>
      <section className="panel statement-panel"><div className="panel-heading"><div><p className="eyebrow">Transaction statement</p><h3>{transactionId}</h3></div><span className="chip chip-neutral">{rows.length} journal entries</span></div>
        <div className="statement-table"><div className="statement-row statement-header"><span>Entry</span><span>Value date</span><span>Booked at</span><span>Transaction amount</span><span>Available impact</span></div>{rows.map((row) => <div className="statement-row" key={row.journalEntryId}><span><strong>{row.entryType}</strong><small>{row.reversalOfReferenceId ? `Reverses ${row.reversalOfReferenceId}` : row.referenceId ?? row.journalEntryId}</small></span><span>{row.valueDate}</span><span>{formatLithicDate(row.bookingTimestamp)}</span><span className={row.amountCents >= 0 ? "amount-positive" : "amount-negative"}>{formatUsdCents(row.amountCents)}</span><span className={row.availableBalanceImpactCents >= 0 ? "amount-positive" : "amount-negative"}>{formatUsdCents(row.availableBalanceImpactCents)}</span></div>)}</div>
      </section>
      <footer className="footer"><span>Value date ≠ booking timestamp</span><span>Append-only ledger</span></footer>
    </>
  );
}
