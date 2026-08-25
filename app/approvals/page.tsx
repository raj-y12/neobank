import { CountUp } from "../components/CountUp";

const queue = [
  {
    name: "Northstar Supplies",
    detail: "ACH payment · initiated by Jordan R.",
    amount: "$1,240.00",
    status: "Awaiting approval",
    tone: "chip-blue",
  },
  {
    name: "Atlas Contractors",
    detail: "ACH payment · initiated by Priya S.",
    amount: "$2,800.00",
    status: "Awaiting approval",
    tone: "chip-blue",
  },
  {
    name: "Jordan R.",
    detail: "Attempted self-approval · blocked",
    amount: "$900.00",
    status: "Rejected",
    tone: "chip-red",
  },
];

export default function ApprovalsPage() {
  return (
    <>
      <section className="intro">
        <div>
          <p className="eyebrow">Maker-checker</p>
          <h2>Approval queue</h2>
        </div>
        <span className="pill pill-orange">Threshold $1,000.00</span>
      </section>

      <section className="hero-card" aria-label="Amount awaiting approval">
        <p className="hero-eyebrow">Awaiting approval</p>
        <p className="hero-value">
          <CountUp value={4040} prefix="$" />
        </p>
        <p className="hero-meta">Across 2 payments · a different human must approve each</p>
        <div className="hero-foot">
          <div className="hero-foot-item">
            <p className="hero-foot-label">Pending</p>
            <p className="hero-foot-value tabular">2</p>
          </div>
          <div className="hero-foot-item">
            <p className="hero-foot-label">Rejected today</p>
            <p className="hero-foot-value tabular">1</p>
          </div>
          <div className="hero-foot-item">
            <p className="hero-foot-label">Self-approval attempts</p>
            <p className="hero-foot-value">Always blocked</p>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Pending review</p>
            <h3>3 items</h3>
          </div>
          <button className="btn-ghost">Approval history</button>
        </div>
        {queue.map((item) => (
          <div className="list-row" key={item.name + item.amount}>
            <div className="list-icon is-orange">$</div>
            <div>
              <p className="list-title">{item.name}</p>
              <p className="list-meta">{item.detail}</p>
            </div>
            <div>
              <p className="list-value">{item.amount}</p>
              <p className="list-sub">
                <span className={`chip ${item.tone}`}>{item.status}</span>
              </p>
            </div>
          </div>
        ))}
      </section>

      <section className="panel" style={{ marginTop: 14 }}>
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Review</p>
            <h3>Northstar Supplies — $1,240.00</h3>
          </div>
        </div>
        <p className="intro-copy" style={{ marginBottom: 20 }}>
          Initiated by Jordan R. on Aug 24. Approving requires a different
          human account than the initiator.
        </p>
        <div style={{ display: "flex", gap: 12 }}>
          <button className="btn btn-primary">Approve</button>
          <button className="btn btn-outline">Reject</button>
        </div>
      </section>

      <footer className="footer">
        <span>Second approver: any admin except the initiator</span>
        <span>Agent writes land here too</span>
      </footer>
    </>
  );
}
