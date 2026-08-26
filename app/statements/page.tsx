import Link from "next/link";
import { formatUsdCents } from "@/src/integrations/lithic/client";
import { getAuthenticatedScope } from "@/src/lib/auth-scope";
import { createSupabaseAccountStatementRepository } from "@/src/repositories/supabase-account-statement-repository";
import { compareStatementRowsLatestFirst, isTransactionsOnlyView, parseStatementDate } from "./statement-controls";

export const dynamic = "force-dynamic";

function signedUsd(value: number) { return value < 0 ? `−${formatUsdCents(Math.abs(value))}` : formatUsdCents(value); }

export default async function StatementsPage({ searchParams }: { searchParams: Promise<{ date?: string; from?: string; to?: string; asOf?: string; view?: string }> }) {
  const scope = await getAuthenticatedScope();
  const repository = createSupabaseAccountStatementRepository();
  const params = await searchParams;
  const requestedFrom = params.from ?? params.date;
  const requestedTo = params.to ?? params.date;
  if ((requestedFrom && !parseStatementDate(requestedFrom)) || (requestedTo && !parseStatementDate(requestedTo))) {
    return <section className="panel empty-state"><h2>Invalid statement date</h2><p>Choose a valid UTC calendar date in YYYY-MM-DD format.</p><Link className="btn btn-outline" href="/statements">Return to statements</Link></section>;
  }
  if (params.asOf && Number.isNaN(Date.parse(params.asOf))) {
    return <section className="panel empty-state"><h2>Invalid knowledge timestamp</h2><p>Choose a valid ISO timestamp for the historical view.</p><Link className="btn btn-outline" href="/statements">Return to statements</Link></section>;
  }
  const [latest, earliest] = await Promise.all([repository.getLatestStatementDate(scope), repository.getEarliestStatementDate(scope)]);
  const statementDate = parseStatementDate(requestedFrom) ?? (isTransactionsOnlyView(params.view) ? earliest : latest) ?? new Date().toISOString().slice(0, 10);
  const statementEndDate = parseStatementDate(requestedTo) ?? (isTransactionsOnlyView(params.view) ? latest : statementDate) ?? statementDate;
  if (statementEndDate < statementDate) {
    return <section className="panel empty-state"><h2>Invalid statement range</h2><p>The end date must be on or after the start date.</p><Link className="btn btn-outline" href="/statements">Return to statements</Link></section>;
  }
  const asOf = params.asOf && !Number.isNaN(Date.parse(params.asOf)) ? new Date(params.asOf).toISOString() : undefined;
  const statement = await repository.getAccountStatement(scope, { statementDate, statementEndDate, asOfBookingTimestamp: asOf });
  const transactionsOnly = isTransactionsOnlyView(params.view);
  const postedImpact = statement.postedRows.reduce((sum, row) => sum + row.availableBalanceImpactCents, 0);
  const holdAvailabilityImpact = statement.holdRows.reduce((sum, row) => sum + row.availableBalanceImpactCents, 0);
  const allRows = [...statement.postedRows, ...statement.holdRows].sort(compareStatementRowsLatestFirst);

  return <>
    <section className="intro statement-intro"><div><p className="eyebrow">{transactionsOnly ? "All transactions" : "Account statement"}</p><h2>{statementDate === statementEndDate ? statementDate : `${statementDate} → ${statementEndDate}`}</h2><p className="intro-copy">{asOf ? `Known at ${new Date(asOf).toLocaleString("en-GB", { timeZone: "UTC" })} UTC` : "Current corrected view"}</p></div><Link className="btn btn-outline" href={transactionsOnly ? "/statements" : "/statements?view=transactions"}>{transactionsOnly ? "Statement summary" : "All transactions"}</Link></section>
    <section className="statement-controls panel"><form><label htmlFor="statement-from">From<input id="statement-from" name="from" type="date" defaultValue={statementDate} /></label><label htmlFor="statement-to">To<input id="statement-to" name="to" type="date" defaultValue={statementEndDate} /></label><label htmlFor="statement-asof">Known at (optional)<input id="statement-asof" name="asOf" type="datetime-local" defaultValue={asOf?.slice(0, 16)} /></label>{transactionsOnly && <input type="hidden" name="view" value="transactions" />}<button className="btn btn-primary" type="submit">View statement</button></form></section>

    {!transactionsOnly && <section className="statement-balance-grid" aria-label="Statement balances">
      <div className="panel statement-balance"><span className="eyebrow">Opening ledger</span><strong>{formatUsdCents(statement.openingLedgerBalanceCents)}</strong><small>Available {formatUsdCents(statement.openingAvailableBalanceCents)} · Holds {formatUsdCents(statement.openingHoldsCents)}</small></div>
      <div className="panel statement-balance"><span className="eyebrow">Closing ledger</span><strong>{formatUsdCents(statement.closingLedgerBalanceCents)}</strong><small>Available {formatUsdCents(statement.closingAvailableBalanceCents)} · Holds {formatUsdCents(statement.closingHoldsCents)}</small></div>
    </section>}

    <section className="panel statement-panel"><div className="panel-heading"><div><p className="eyebrow">{transactionsOnly ? "Transactions" : "All activity"}</p><h3>{allRows.length > 0 ? `${allRows.length} entries` : "No transactions"}</h3></div></div>{allRows.length === 0 ? <div className="empty-state"><h4>No transactions in this range</h4><p>Your balances are carried forward from the previous statement day.</p></div> : <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Type</th><th>Value date</th><th>Booked at</th><th>Amount</th><th>Available impact</th><th>Running available</th></tr></thead><tbody>{allRows.map((row) => <tr key={row.journalEntryId}><td><strong>{row.entryType.replaceAll("_", " ")}</strong>{row.kind === "CORRECTION" && <span className="chip chip-orange statement-chip">Correction</span>}{row.kind === "HOLD" && <span className="chip chip-neutral statement-chip">Hold</span>}<small>{row.referenceId ?? row.journalEntryId}</small></td><td>{row.valueDate}</td><td>{new Date(row.bookingTimestamp).toLocaleString("en-GB", { timeZone: "UTC" })} UTC</td><td className="tabular">{signedUsd(row.postedAmountCents)}</td><td className="tabular">{signedUsd(row.availableBalanceImpactCents)}</td><td className="tabular">{formatUsdCents(row.runningAvailableBalanceCents)}</td></tr>)}</tbody></table></div>}</section>

    {!transactionsOnly && <section className="panel statement-reconciliation"><span className="eyebrow">Reconciliation</span><p className="tabular">Opening available {formatUsdCents(statement.openingAvailableBalanceCents)} + {signedUsd(postedImpact)} posted + {signedUsd(holdAvailabilityImpact)} hold availability impact = <strong>{formatUsdCents(statement.closingAvailableBalanceCents)}</strong></p></section>}
  </>;
}
