import Link from "next/link";
import { formatUsdCents } from "@/src/integrations/lithic/client";
import { getAuthenticatedScope } from "@/src/lib/auth-scope";
import { createSupabaseAccountStatementRepository } from "@/src/repositories/supabase-account-statement-repository";
import { parseStatementDate } from "./statement-controls";

export const dynamic = "force-dynamic";

function signedUsd(value: number) { return value < 0 ? `−${formatUsdCents(Math.abs(value))}` : formatUsdCents(value); }

export default async function StatementsPage({ searchParams }: { searchParams: Promise<{ date?: string; asOf?: string }> }) {
  const scope = await getAuthenticatedScope();
  const repository = createSupabaseAccountStatementRepository();
  const params = await searchParams;
  if (params.date && !parseStatementDate(params.date)) {
    return <section className="panel empty-state"><h2>Invalid statement date</h2><p>Choose a valid UTC calendar date in YYYY-MM-DD format.</p><Link className="btn btn-outline" href="/statements">Return to statements</Link></section>;
  }
  if (params.asOf && Number.isNaN(Date.parse(params.asOf))) {
    return <section className="panel empty-state"><h2>Invalid knowledge timestamp</h2><p>Choose a valid ISO timestamp for the historical view.</p><Link className="btn btn-outline" href="/statements">Return to statements</Link></section>;
  }
  const latest = await repository.getLatestStatementDate(scope);
  const statementDate = parseStatementDate(params.date) ?? latest ?? new Date().toISOString().slice(0, 10);
  const asOf = params.asOf && !Number.isNaN(Date.parse(params.asOf)) ? new Date(params.asOf).toISOString() : undefined;
  const statement = await repository.getAccountStatement(scope, { statementDate, asOfBookingTimestamp: asOf });
  const postedImpact = statement.postedRows.reduce((sum, row) => sum + row.availableBalanceImpactCents, 0);
  const holdAvailabilityImpact = statement.holdRows.reduce((sum, row) => sum + row.availableBalanceImpactCents, 0);
  const hasActivity = statement.postedRows.length > 0 || statement.holdRows.length > 0;

  return <>
    <section className="intro statement-intro"><div><p className="eyebrow">Account statement</p><h2>{statementDate}</h2><p className="intro-copy">{asOf ? `Known at ${new Date(asOf).toLocaleString("en-GB", { timeZone: "UTC" })} UTC` : "Current corrected view"}</p></div><Link className="btn btn-outline" href="/statements">Reset view</Link></section>
    <section className="statement-controls panel"><form><label htmlFor="statement-date">Statement date</label><input id="statement-date" name="date" type="date" defaultValue={statementDate} /><label htmlFor="statement-asof">Known at (optional)</label><input id="statement-asof" name="asOf" type="datetime-local" defaultValue={asOf?.slice(0, 16)} /><button className="btn btn-primary" type="submit">View statement</button></form></section>

    <section className="statement-balance-grid" aria-label="Statement balances">
      <div className="panel statement-balance"><span className="eyebrow">Opening ledger</span><strong>{formatUsdCents(statement.openingLedgerBalanceCents)}</strong><small>Available {formatUsdCents(statement.openingAvailableBalanceCents)} · Holds {formatUsdCents(statement.openingHoldsCents)}</small></div>
      <div className="panel statement-balance"><span className="eyebrow">Closing ledger</span><strong>{formatUsdCents(statement.closingLedgerBalanceCents)}</strong><small>Available {formatUsdCents(statement.closingAvailableBalanceCents)} · Holds {formatUsdCents(statement.closingHoldsCents)}</small></div>
    </section>

    <section className="panel statement-panel"><div className="panel-heading"><div><p className="eyebrow">Posted activity</p><h3>{hasActivity ? `${statement.postedRows.length} entries` : "No activity"}</h3></div></div>{statement.postedRows.length === 0 ? <div className="empty-state"><h4>No posted activity on this date</h4><p>Your balances are carried forward from the previous statement day.</p></div> : <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Entry</th><th>Value date</th><th>Booked at</th><th>Amount</th><th>Available impact</th><th>Running available</th></tr></thead><tbody>{statement.postedRows.map((row) => <tr key={row.journalEntryId}><td><strong>{row.entryType.replaceAll("_", " ")}</strong>{row.kind === "CORRECTION" && <span className="chip chip-orange statement-chip">Correction</span>}<small>{row.referenceId ?? row.journalEntryId}</small></td><td>{row.valueDate}</td><td>{new Date(row.bookingTimestamp).toLocaleString("en-GB", { timeZone: "UTC" })} UTC</td><td className="tabular">{signedUsd(row.postedAmountCents)}</td><td className="tabular">{signedUsd(row.availableBalanceImpactCents)}</td><td className="tabular">{formatUsdCents(row.runningAvailableBalanceCents)}</td></tr>)}</tbody></table></div>}</section>

    <section className="panel statement-panel"><div className="panel-heading"><div><p className="eyebrow">Holds & pending activity</p><h3>{statement.holdRows.length} entries</h3></div></div>{statement.holdRows.length === 0 ? <p className="list-meta">No hold activity on this date.</p> : <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Entry</th><th>Booked at</th><th>Hold impact</th><th>Available impact</th></tr></thead><tbody>{statement.holdRows.map((row) => <tr key={row.journalEntryId}><td><strong>{row.entryType.replaceAll("_", " ")}</strong><small>{row.referenceId ?? row.journalEntryId}</small></td><td>{new Date(row.bookingTimestamp).toLocaleString("en-GB", { timeZone: "UTC" })} UTC</td><td className="tabular">{signedUsd(row.holdImpactCents)}</td><td className="tabular">{signedUsd(row.availableBalanceImpactCents)}</td></tr>)}</tbody></table></div>}</section>

    <section className="panel statement-reconciliation"><span className="eyebrow">Reconciliation</span><p className="tabular">{formatUsdCents(statement.openingAvailableBalanceCents)} + {signedUsd(postedImpact)} posted + {signedUsd(holdAvailabilityImpact)} hold availability impact = <strong>{formatUsdCents(statement.closingAvailableBalanceCents)}</strong></p></section>
  </>;
}
