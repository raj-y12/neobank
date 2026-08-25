const lines = [
  { date: "Aug 21", desc: "Shell Fuel #4021 auth", value: "−$50.00 held" },
  { date: "Aug 23", desc: "Payroll funding", value: "+$18,200.00" },
  { date: "Aug 24", desc: "Shell Fuel #4021 settled", value: "−$73.40" },
];

export default function StatementsPage() {
  return (
    <>
      <section className="intro">
        <div>
          <p className="eyebrow">Historical statement</p>
          <h2>Aug 21, 2026</h2>
          <p className="intro-copy">
            Statements are reproducible for any past date, corrections
            included. This is what the account looked like on that value
            date, plus what the system knew as of today.
          </p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <input className="input" type="date" defaultValue="2026-08-21" style={{ width: 170 }} />
          <button className="btn btn-outline">Export PDF</button>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">As it stood then</p>
            <h3>Closing balance, corrected</h3>
          </div>
          <span className="chip chip-red">Corrected Aug 24</span>
        </div>
        <p className="intro-copy" style={{ marginBottom: 20 }}>
          A merchant reversed this settlement three days after the value
          date. The corrected figure below is what Aug 21 shows today — the
          original entry was never edited, only reversed and re-booked.
        </p>
        {lines.map((l) => (
          <div className="list-row" key={l.desc}>
            <div className="list-icon is-navy">{l.date.slice(0, 1)}</div>
            <div>
              <p className="list-title">{l.desc}</p>
              <p className="list-meta">Value date {l.date}</p>
            </div>
            <p className="list-value">{l.value}</p>
          </div>
        ))}
      </section>

      <section className="content-grid">
        <article className="panel">
          <p className="card-label">Believed on Aug 22</p>
          <p className="metric-value">$24,753.40</p>
          <p className="card-detail">Booking date snapshot, pre-correction</p>
        </article>
        <article className="panel">
          <p className="card-label">Known today</p>
          <p className="metric-value">$24,680.00</p>
          <p className="card-detail">Booking date snapshot, post-correction</p>
        </article>
      </section>

      <footer className="footer">
        <span>Value date Aug 21 · Booking date Aug 24</span>
        <span>Identical output on every re-run</span>
      </footer>
    </>
  );
}
