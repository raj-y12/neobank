import { CountUp } from "./components/CountUp";
import { LedgerActivity } from "./components/LedgerActivity";
import Link from "next/link";
import { openingBalance } from "@/src/domain/ledger";
import { formatUsdCents } from "@/src/integrations/lithic/client";
import { createSupabaseLedgerRepository } from "@/src/repositories/supabase-ledger-repository";
import { getLedgerActivity } from "@/src/repositories/supabase-ledger-statement-repository";
import { getAuthenticatedScope } from "@/src/lib/auth-scope";
import { IconArrowDown, IconArrowUp, IconDollar, IconReceipt } from "./components/Icon";

export const dynamic = "force-dynamic";

export default async function Home() {
  const scope = await getAuthenticatedScope();
  const ledger = createSupabaseLedgerRepository();
  const openingBalanceCents = Number(process.env.LEDGER_OPENING_BALANCE_CENTS ?? 100_000);
  const valueDate = new Date().toISOString().slice(0, 10);
  await ledger.record(openingBalance(openingBalanceCents, valueDate), "seed:opening-balance:v1");
  const balances = await ledger.getBalances({
    businessId: scope.businessId,
    accountId: scope.accountId,
  });
  const activity = await getLedgerActivity(8, {
    businessId: scope.businessId,
    accountId: scope.accountId,
  });

  return (
    <>
      <section className="intro">
        <h2>Overview</h2>
        <Link className="btn btn-primary" href="/payments">Send money</Link>
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
              <Link className="pill-btn" href="/statements/card/card-4821"><IconReceipt /> Statement</Link>
              <Link className="pill-btn" href="/funding"><IconArrowDown /> Add money</Link>
              <Link className="pill-btn is-primary" href="/payments"><IconArrowUp /> Send</Link>
            </div>
          </div>

          <div className="account-card-transactions">
            {activity.length === 0 ? <div className="empty-state">
              <div className="empty-icon">↗</div>
              <h4>Your ledger will appear here</h4>
              <p>Once funding and card activity are connected, every movement will be shown from the immutable ledger.</p>
            </div> : <LedgerActivity rows={activity} />}
            <Link className="see-all" href="/statements/card/card-4821">See all transactions →</Link>
          </div>
        </article>

        <aside className="widgets-rail">
          <div className="widget-card">
            <div className="panel-heading"><h3>Approvals</h3><span className="chip chip-orange">2</span></div>
            <div className="list-row"><div className="list-icon is-blue"><IconDollar /></div><div><p className="list-title">Northstar Supplies</p><p className="list-meta">ACH · $1,240.00</p></div><span className="status-dot" /></div>
            <div className="list-row"><div className="list-icon is-blue"><IconDollar /></div><div><p className="list-title">Atlas Contractors</p><p className="list-meta">ACH · $2,800.00</p></div><span className="status-dot" /></div>
            <Link className="btn btn-outline btn-block" href="/approvals">Open approval queue</Link>
          </div>

          <div className="widget-card">
            <h3>Operating account</h3>
            <div className="list-row"><div className="list-icon is-navy"><IconDollar /></div><div><p className="list-title">Ledger balance</p></div><span className="list-value">{formatUsdCents(balances.ledgerBalanceCents)}</span></div>
          </div>
        </aside>
      </section>

    </>
  );
}
