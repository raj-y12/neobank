import { CountUp } from "./components/CountUp";
import Link from "next/link";
import { openingBalance } from "@/src/domain/ledger";
import { formatUsdCents } from "@/src/integrations/lithic/client";
import { createSupabaseLedgerRepository } from "@/src/repositories/supabase-ledger-repository";
import { getLedgerActivity } from "@/src/repositories/supabase-ledger-statement-repository";
import { getAuthenticatedScope } from "@/src/lib/auth-scope";

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

  const entryMeta: Record<string, { label: string; icon: string; tone: string }> = {
    OPENING_BALANCE: { label: "Opening balance", icon: "●", tone: "is-navy" },
    CARD_AUTHORIZATION_HOLD: { label: "Card authorization hold", icon: "⏸", tone: "is-orange" },
    CARD_CLEARING: { label: "Card settlement", icon: "↑", tone: "is-orange" },
    CARD_AUTHORIZATION_REVERSAL: { label: "Hold released", icon: "↺", tone: "is-blue" },
    CARD_SETTLEMENT_REVERSAL: { label: "Settlement reversed", icon: "↺", tone: "is-blue" },
  };

  const formatActivityTime = (iso: string) =>
    new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));

  return (
    <>
      <section className="intro">
        <div>
          <p className="eyebrow">Good morning, Raj</p>
          <h2>Keep the business moving.</h2>
        </div>
        <Link className="btn btn-primary" href="/payments">Send payment</Link>
      </section>

      <section className="hero-card" aria-label="Available balance">
        <p className="hero-eyebrow">Available balance</p>
        <p className="hero-value">
          <CountUp value={balances.availableBalanceCents / 100} prefix="$" />
        </p>
        <p className="hero-meta">{formatUsdCents(balances.activeHoldsCents)} held across active authorizations</p>
        <div className="hero-foot">
          <div className="hero-foot-item">
            <p className="hero-foot-label">Ledger balance</p>
            <p className="hero-foot-value tabular">
              <CountUp value={balances.ledgerBalanceCents / 100} prefix="$" durationMs={700} />
            </p>
          </div>
          <div className="hero-foot-item">
            <p className="hero-foot-label">Pending approvals</p>
            <p className="hero-foot-value tabular">2</p>
          </div>
          <div className="hero-foot-item">
            <p className="hero-foot-label">Account</p>
            <p className="hero-foot-value">USD · Operating</p>
          </div>
        </div>
        <div className="quick-actions">
          <Link className="quick-action" href="/payments">↑ Send</Link>
          <Link className="quick-action" href="/funding">↓ Add money</Link>
          <Link className="quick-action" href="/cards">＋ New card</Link>
          <Link className="quick-action" href="/statements/card/card-4821">≡ Statement</Link>
        </div>
      </section>

      <section className="content-grid">
        <article className="panel activity-panel">
          <div className="panel-heading">
            <div><p className="eyebrow">Account activity</p><h3>Recent transactions</h3></div>
            <Link className="btn-ghost" href="/statements/card/card-4821">View statement</Link>
          </div>
          {activity.length === 0 ? <div className="empty-state">
            <div className="empty-icon">↗</div>
            <h4>Your ledger will appear here</h4>
            <p>Once funding and card activity are connected, every movement will be shown from the immutable ledger.</p>
          </div> : <div>
            {activity.map((row) => {
              const amount = row.availableBalanceImpactCents;
              const amountPrefix = amount > 0 ? "+" : amount < 0 ? "−" : "";
              const meta = entryMeta[row.entryType];
              const icon = meta?.icon ?? (amount >= 0 ? "↓" : "↑");
              const tone = meta?.tone ?? (amount >= 0 ? "is-blue" : "is-orange");
              return <div className="list-row" key={row.journalEntryId}>
                <div className={`list-icon ${tone}`}>{icon}</div>
                <div>
                  <p className="list-title">{meta?.label ?? row.entryType}</p>
                  <p className="list-meta">{formatActivityTime(row.bookingTimestamp)}</p>
                </div>
                <div className="list-value">
                  <span className={amount >= 0 ? "amount-positive" : "amount-negative"}>{amountPrefix}{formatUsdCents(Math.abs(amount))}</span>
                  <p className="list-sub">Available balance</p>
                </div>
              </div>;
            })}
          </div>}
        </article>

        <aside className="panel approval-panel">
          <div className="panel-heading"><div><p className="eyebrow">Maker-checker</p><h3>Approvals</h3></div><span className="chip chip-orange">2</span></div>
          <div className="list-row"><div className="list-icon is-blue">$</div><div><p className="list-title">Northstar Supplies</p><p className="list-meta">ACH payment · $1,240.00</p></div><span className="status-dot" /></div>
          <div className="list-row"><div className="list-icon is-blue">$</div><div><p className="list-title">Atlas Contractors</p><p className="list-meta">ACH payment · $2,800.00</p></div><span className="status-dot" /></div>
          <Link className="btn btn-outline btn-block" href="/approvals">Open approval queue</Link>
        </aside>
      </section>

      <footer className="footer"><span>New York, USA</span><span>Business operating account</span></footer>
    </>
  );
}
