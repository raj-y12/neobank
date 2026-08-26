import Link from "next/link";
import { formatLithicDate, formatUsdCents } from "@/src/integrations/lithic/client";
import { getLedgerStatement } from "@/src/repositories/supabase-ledger-statement-repository";
import { getAuthenticatedScope } from "@/src/lib/auth-scope";
import { requirePageAccess } from "@/src/lib/page-authorization";
import { IconChevronLeft } from "../../../components/Icon";

export const dynamic = "force-dynamic";

function parseAsOf(value: string | undefined) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function formatDateTimeLocal(value: string | undefined) {
  if (!value) return "";
  return value.slice(0, 16);
}

export default async function CardStatementPage({ params, searchParams }: { params: Promise<{ transactionId: string }>; searchParams: Promise<{ asOf?: string }> }) {
  const { transactionId } = await params;
  const { asOf } = await searchParams;
  const asOfBookingTimestamp = parseAsOf(asOf);
  const scope = await getAuthenticatedScope();
  requirePageAccess(scope, "/statements/card");
  const rows = await getLedgerStatement(transactionId, asOfBookingTimestamp, scope);

  return (
    <>
      <section className="intro"><div><Link className="back-link" href="/cards"><IconChevronLeft /> Cards</Link><h2>Card correction statement</h2><p className="intro-copy">Immutable journal activity for the customer account.</p></div><span className="pill pill-orange">BITEMPORAL</span></section>
      <section className="panel statement-panel"><div className="panel-heading"><div><p className="eyebrow">Transaction statement</p><h3>{transactionId}</h3><p className="intro-copy">{asOfBookingTimestamp ? `What the ledger knew by ${formatLithicDate(asOfBookingTimestamp)}` : "Current corrected view"}</p></div><span className="chip chip-neutral">{rows.length} journal entries</span></div>
        <form className="statement-controls" method="get"><label htmlFor="statement-as-of">Known at</label><input id="statement-as-of" name="asOf" type="datetime-local" step="1" defaultValue={formatDateTimeLocal(asOfBookingTimestamp)} /><button className="btn btn-outline" type="submit">View snapshot</button>{asOfBookingTimestamp && <Link className="btn btn-ghost" href={`/statements/card/${transactionId}`}>Current view</Link>}</form>
        <div className="statement-table"><div className="statement-row statement-header"><span>Entry</span><span>Value date</span><span>Booked at</span><span>Transaction amount</span><span>Available impact</span></div>{rows.map((row) => <div className="statement-row" key={row.journalEntryId}><span><strong>{row.entryType}</strong><small>{row.reversalOfReferenceId ? `Reverses ${row.reversalOfReferenceId}` : row.referenceId ?? row.journalEntryId}</small></span><span>{row.valueDate}</span><span>{formatLithicDate(row.bookingTimestamp)}</span><span className={row.amountCents >= 0 ? "amount-positive" : "amount-negative"}>{formatUsdCents(row.amountCents)}</span><span className={row.availableBalanceImpactCents >= 0 ? "amount-positive" : "amount-negative"}>{formatUsdCents(row.availableBalanceImpactCents)}</span></div>)}</div>
      </section>
      <footer className="footer"><span>Value date ≠ booking timestamp</span><span>Append-only ledger</span></footer>
    </>
  );
}
