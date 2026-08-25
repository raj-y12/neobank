import { CountUp } from "./components/CountUp";

export default function Home() {
  return (
    <>
      <section className="intro">
        <div>
          <p className="eyebrow">Good morning, Raj</p>
          <h2>Keep the business moving.</h2>
        </div>
        <button className="btn btn-primary">Send payment</button>
      </section>

      <section className="hero-card" aria-label="Available balance">
        <p className="hero-eyebrow">Available balance</p>
        <p className="hero-value">
          <CountUp value={23940} prefix="$" />
        </p>
        <p className="hero-meta">$740.00 held across 1 active authorization</p>
        <div className="hero-foot">
          <div className="hero-foot-item">
            <p className="hero-foot-label">Ledger balance</p>
            <p className="hero-foot-value tabular">
              <CountUp value={24680} prefix="$" durationMs={700} />
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
          <span className="quick-action">↑ Send</span>
          <span className="quick-action">↓ Add money</span>
          <span className="quick-action">＋ New card</span>
          <span className="quick-action">≡ Statement</span>
        </div>
      </section>

      <section className="content-grid">
        <article className="panel activity-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Account activity</p>
              <h3>Recent transactions</h3>
            </div>
            <button className="btn-ghost">View statement</button>
          </div>
          <div className="empty-state">
            <div className="empty-icon">↗</div>
            <h4>Your ledger will appear here</h4>
            <p>
              Once funding and card activity are connected, every movement will
              be shown from the immutable ledger.
            </p>
          </div>
        </article>

        <aside className="panel approval-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Maker-checker</p>
              <h3>Approvals</h3>
            </div>
            <span className="chip chip-orange">2</span>
          </div>
          <div className="list-row">
            <div className="list-icon is-blue">$</div>
            <div>
              <p className="list-title">Northstar Supplies</p>
              <p className="list-meta">ACH payment · $1,240.00</p>
            </div>
            <span className="status-dot" />
          </div>
          <div className="list-row">
            <div className="list-icon is-blue">$</div>
            <div>
              <p className="list-title">Atlas Contractors</p>
              <p className="list-meta">ACH payment · $2,800.00</p>
            </div>
            <span className="status-dot" />
          </div>
          <button className="btn btn-outline btn-block">Open approval queue</button>
        </aside>
      </section>

      <footer className="footer">
        <span>USD · America/New_York</span>
        <span>Ledger-first sandbox</span>
      </footer>
    </>
  );
}
