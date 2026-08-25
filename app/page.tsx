const metrics = [
  { label: "Ledger balance", value: "$24,680.00", detail: "USD account" },
  { label: "Available balance", value: "$23,940.00", detail: "$740.00 held" },
  { label: "Pending approvals", value: "2", detail: "Needs review" },
];

export default function Home() {
  return (
    <>
      <section className="intro">
        <div>
          <p className="eyebrow">Good morning, Raj</p>
          <h2>Keep the business moving.</h2>
          <p className="intro-copy">
            Your balances, cards, and payments in one clear operating view.
          </p>
        </div>
        <button className="btn btn-primary">Send payment</button>
      </section>

      <section className="metric-grid" aria-label="Account overview">
        {metrics.map((metric) => (
          <article className="metric-card" key={metric.label}>
            <p className="card-label">{metric.label}</p>
            <p className="metric-value">{metric.value}</p>
            <p className="card-detail">{metric.detail}</p>
          </article>
        ))}
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
