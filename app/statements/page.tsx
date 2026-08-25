import { CountUp } from "../components/CountUp";

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
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <input className="input" type="date" defaultValue="2026-08-21" style={{ width: 170 }} />
          <button className="btn btn-outline">Export PDF</button>
        </div>
      </section>

      <section className="hero-card" aria-label="Corrected closing balance">
        <p className="hero-eyebrow">Closing balance, corrected</p>
        <p className="hero-value">
          <CountUp value={24680} prefix="$" />
        </p>
        <p className="hero-meta">
          A merchant reversed this settlement 3 days after the value date —
          the original entry was never edited, only reversed and re-booked.
        </p>
        <div className="hero-foot">
          <div className="hero-foot-item">
            <p className="hero-foot-label">Believed on Aug 22</p>
            <p className="hero-foot-value tabular">$24,753.40</p>
          </div>
          <div className="hero-foot-item">
            <p className="hero-foot-label">Known today</p>
            <p className="hero-foot-value tabular">$24,680.00</p>
          </div>
          <div className="hero-foot-item">
            <p className="hero-foot-label">Corrected on</p>
            <p className="hero-foot-value">Aug 24</p>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">As it stood then</p>
            <h3>Value date Aug 21</h3>
          </div>
          <span className="chip chip-red">Corrected Aug 24</span>
        </div>
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

      <footer className="footer">
        <span>Value date Aug 21 · Booking date Aug 24</span>
        <span>Identical output on every re-run</span>
      </footer>
    </>
  );
}
