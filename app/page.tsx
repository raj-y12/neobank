import { CountUp } from "./components/CountUp";
import { LedgerActivity } from "./components/LedgerActivity";
import Link from "next/link";
import { formatUsdCents } from "@/src/integrations/lithic/client";
import { createSupabaseLedgerRepository } from "@/src/repositories/supabase-ledger-repository";
import { getLedgerActivity } from "@/src/repositories/supabase-ledger-statement-repository";
import { createSupabasePaymentRepository } from "@/src/repositories/supabase-payment-repository";
import { getAuthenticatedScope } from "@/src/lib/auth-scope";
import { IconArrowDown, IconArrowUp, IconDollar, IconReceipt } from "./components/Icon";

export const dynamic = "force-dynamic";

export default async function Home() {
  const scope = await getAuthenticatedScope();
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
            <Link className="see-all" href="/statements">See all transactions <span aria-hidden="true">→</span></Link>
          </div>
        </article>

        <aside className="widgets-rail">
          {scope.role === "ADMIN" && (
            <div className="widget-card">
              <div className="panel-heading"><h3>Approvals</h3><span className="chip chip-orange">{pendingApprovals.length}</span></div>
              {pendingApprovals.length === 0 ? <p className="list-meta">Nothing waiting on your approval.</p> : pendingApprovals.slice(0, 3).map((approval) => (
                <div className="list-row" key={approval.id}><div className="list-icon is-blue"><IconDollar /></div><div><p className="list-title">{approval.recipient}</p><p className="list-meta">ACH · {formatUsdCents(approval.amountCents)}</p></div><span className="status-dot" /></div>
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
