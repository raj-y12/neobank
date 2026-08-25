const breaks = [
  {
    kind: "In file, not ledger",
    ref: "SCH-88213",
    amount: "$412.00",
    age: "1 day",
    tone: "chip-red",
  },
  {
    kind: "Amount mismatch",
    ref: "SCH-88190",
    amount: "$73.40 vs $71.90",
    age: "1 day",
    tone: "chip-orange",
  },
  {
    kind: "In ledger, not file",
    ref: "LED-33021",
    amount: "$1,240.00",
    age: "3 days",
    tone: "chip-red",
  },
];

export default function ReconciliationPage() {
  return (
    <>
      <section className="intro">
        <div>
          <p className="eyebrow">Nightly scheme file vs. ledger</p>
          <h2>Reconciliation breaks</h2>
          <p className="intro-copy">
            Every break is diffed automatically. Nothing here is fixed by
            editing a row — a break resolves only when a matching entry
            appears on both sides.
          </p>
        </div>
        <button className="btn btn-outline">Run reconciliation now</button>
      </section>

      <section className="metric-grid" aria-label="Reconciliation summary">
        <article className="metric-card">
          <p className="card-label">File lines</p>
          <p className="metric-value">1,204</p>
          <p className="card-detail">Aug 24 scheme file</p>
        </article>
        <article className="metric-card">
          <p className="card-label">Matched</p>
          <p className="metric-value">1,201</p>
          <p className="card-detail">99.8% auto-matched</p>
        </article>
        <article className="metric-card">
          <p className="card-label">Open breaks</p>
          <p className="metric-value">3</p>
          <p className="card-detail">Oldest: 3 days</p>
        </article>
      </section>

      <section className="panel" style={{ marginTop: 14 }}>
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Breaks</p>
            <h3>Aged by day</h3>
          </div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Reference</th>
              <th>Amount</th>
              <th>Age</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {breaks.map((b) => (
              <tr key={b.ref}>
                <td>{b.kind}</td>
                <td>{b.ref}</td>
                <td>{b.amount}</td>
                <td>{b.age}</td>
                <td>
                  <span className={`chip ${b.tone}`}>Open</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <footer className="footer">
        <span>Source: processor scheme file (SFTP)</span>
        <span>Comparison: our append-only ledger</span>
      </footer>
    </>
  );
}
