import { CountUp } from "./components/CountUp";
import { LedgerActivity } from "./components/LedgerActivity";
import Link from "next/link";
import { formatUsdCents } from "@/src/integrations/lithic/client";
import { createSupabaseLedgerRepository } from "@/src/repositories/supabase-ledger-repository";
import { getLedgerActivity } from "@/src/repositories/supabase-ledger-statement-repository";
import { createSupabasePaymentRepository } from "@/src/repositories/supabase-payment-repository";
import { getAuthenticatedScope } from "@/src/lib/auth-scope";
import { IconArrowDown, IconArrowUp, IconDollar, IconReceipt } from "./components/Icon";
import { listLithicCards } from "@/src/integrations/lithic/client";
import { listBusinessCardAssignments } from "@/src/repositories/supabase-business-card-repository";
import { filterVisibleCards } from "@/src/domain/card-access";
import { CardTile } from "./cards/CardTile";
import { paymentStatusLabel } from "@/src/domain/payment-request-view";

export const dynamic = "force-dynamic";

export default async function Home() {
  const scope = await getAuthenticatedScope();
  if (scope.role === "MEMBER") return <MemberHome scope={scope} />;
  const ledger = createSupabaseLedgerRepository();
  const ledgerScope = { businessId: scope.businessId, accountId: scope.accountId };
  const [balances, activity, pendingApprovals] = await Promise.all([
    ledger.getBalances(ledgerScope),
    getLedgerActivity(8, ledgerScope),
    scope.role === "ADMIN" ? createSupabasePaymentRepository().listPending(scope.businessId) : Promise.resolve([]),
  ]);

  return (
    <>
      <section className="intro">
        <h2>Overview</h2>
      </section>

      <section className="dashboard-grid">
        <article className="account-card" aria-label="Available balance">
          <div className="account-card-top">
            <div>
              <p className="account-card-value tabular">
                <CountUp value={balances.availableBalanceCents / 100} prefix="$" />
              </p>
              <p className="account-card-sub">USD · Operating · {formatUsdCents(balances.activeHoldsCents)} held</p>
            </div>
            <div className="account-card-actions">
              <Link className="pill-btn" href="/statements"><IconReceipt /> Statement</Link>
              <Link className="pill-btn" href="/funding"><IconArrowDown /> Add money</Link>
              <Link className="pill-btn is-primary" href="/payments"><IconArrowUp /> Send</Link>
            </div>
          </div>

          <div className="account-card-transactions">
            {activity.length === 0 ? <div className="empty-state">
              <div className="empty-icon"><IconArrowUp /></div>
              <h4>Your ledger will appear here</h4>
              <p>Once funding and card activity are connected, every movement will be shown from the immutable ledger.</p>
            </div> : <LedgerActivity rows={activity} />}
            <Link className="see-all" href="/statements?view=transactions">See all transactions <span aria-hidden="true">→</span></Link>
          </div>
        </article>

        <aside className="widgets-rail">
          {scope.role === "ADMIN" && (
            <div className="widget-card">
              <div className="panel-heading"><h3>Approvals</h3><span className="chip chip-orange">{pendingApprovals.length}</span></div>
              {pendingApprovals.length === 0 ? <p className="list-meta">Nothing waiting on your approval.</p> : pendingApprovals.slice(0, 3).map((approval) => (
                <Link className="list-row" href="/approvals" key={approval.id} aria-label={`Review approval for ${approval.recipient}`}><div className="list-icon is-blue"><IconDollar /></div><div><p className="list-title">{approval.recipient}</p><p className="list-meta">ACH · {formatUsdCents(approval.amountCents)}</p></div><span className="status-dot" /></Link>
              ))}
              <Link className="btn btn-outline btn-block" href="/approvals">Open approval queue</Link>
            </div>
          )}

          <div className="widget-card">
            <div className="panel-heading"><h3>Operating account</h3></div>
            <div className="list-row"><div className="list-icon is-navy"><IconDollar /></div><div><p className="list-title">Ledger balance</p></div><span className="list-value">{formatUsdCents(balances.ledgerBalanceCents)}</span></div>
          </div>
        </aside>
      </section>

    </>
  );
}

async function MemberHome({ scope }: { scope: Awaited<ReturnType<typeof getAuthenticatedScope>> }) {
  const [providerCards, assignments, requests] = await Promise.all([
    listLithicCards(),
    listBusinessCardAssignments(scope.businessId),
    createSupabasePaymentRepository().listForMember(scope.businessId, scope.memberId),
  ]);
  const visibleAssignments = filterVisibleCards(assignments, { role: scope.role, currentMemberId: scope.memberId });
  const assignmentByToken = new Map(visibleAssignments.map((assignment) => [assignment.cardToken, assignment]));
  const cards = providerCards.filter((card) => assignmentByToken.has(card.token));
  return <>
    <section className="intro"><h2>Overview</h2><p className="intro-copy">Your cards and payment requests.</p></section>
    <section className="section-panel"><div className="panel-heading"><div><p className="eyebrow">Your cards</p><h3>{cards.length} delegated card{cards.length === 1 ? "" : "s"}</h3></div><Link className="btn btn-outline" href="/cards">View cards</Link></div>{cards.length === 0 ? <div className="panel empty-state"><h4>No cards yet</h4><p>Your administrator will assign a card here.</p></div> : <div className="card-tile-grid">{cards.map((card) => { const assignment = visibleAssignments.find((item) => item.cardToken === card.token); return <CardTile key={card.token} card={card} href={`/cards/${card.token}`} delegatedTo={assignment?.employeeName} cardColor={assignment?.cardColor} />; })}</div>}</section>
    <section className="panel"><div className="panel-heading"><div><p className="eyebrow">My requests</p><h3>Recent payment requests</h3></div><Link className="btn btn-outline" href="/approvals">View all</Link></div>{requests.length === 0 ? <div className="empty-state"><h4>No requests yet</h4><p>Payments you send will appear here.</p></div> : <div>{requests.slice(0, 5).map((request) => <div className="list-row" key={request.id}><div><p className="list-title">{request.recipient}</p><p className="list-meta">{new Date(request.createdAt).toLocaleDateString("en-GB")}</p></div><span className={`table-status status-${request.status.toLowerCase().replaceAll("_", "-")}`}>{paymentStatusLabel(request.status)}</span><span className="list-value">{formatUsdCents(request.amountCents)}</span></div>)}</div>}</section>
    <section className="status-card"><div><strong>Ready to send money?</strong><p className="list-meta">Create a payment request for your admin to review when required.</p></div><Link className="btn btn-primary" href="/payments">Send money</Link></section>
  </>;
}
