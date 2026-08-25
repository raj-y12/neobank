import { CountUp } from "../components/CountUp";

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
        </div>
        <button className="btn btn-outline">Run reconciliation now</button>
      </section>

      <section className="hero-card" aria-label="Match rate">
        <p className="hero-eyebrow">Auto-matched</p>
        <p className="hero-value">
          <CountUp value={99.8} decimals={1} suffix="%" durationMs={700} />
        </p>
        <p className="hero-meta">1,201 of 1,204 lines in last night&apos;s scheme file</p>
        <div className="hero-foot">
          <div className="hero-foot-item">
            <p className="hero-foot-label">Open breaks</p>
            <p className="hero-foot-value tabular">3</p>
          </div>
          <div className="hero-foot-item">
            <p className="hero-foot-label">Oldest break</p>
            <p className="hero-foot-value">3 days</p>
          </div>
          <div className="hero-foot-item">
            <p className="hero-foot-label">Source</p>
            <p className="hero-foot-value">Processor SFTP</p>
          </div>
        </div>
      </section>

      <section className="panel">
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
