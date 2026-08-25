import { CountUp } from "../components/CountUp";

const events = [
  {
    label: "Authorization",
    detail: "Shell Fuel #4021 · Card ····4821",
    amount: "$50.00",
    tag: { text: "Hold placed", tone: "chip-blue" },
    icon: "is-blue",
  },
  {
    label: "Capture",
    detail: "Settled 2 days later · different amount",
    amount: "$73.40",
    tag: { text: "Settled", tone: "chip-orange" },
    icon: "is-orange",
  },
  {
    label: "Hold release",
    detail: "Released exactly once",
    amount: "—",
    tag: { text: "Released", tone: "chip-neutral" },
    icon: "is-navy",
  },
  {
    label: "Settlement reversal",
    detail: "Merchant reversed on value date +1",
    amount: "−$73.40",
    tag: { text: "Reversed", tone: "chip-red" },
    icon: "is-blue",
  },
];

export default function CardsPage() {
  return (
    <>
      <section className="intro">
        <div>
          <p className="eyebrow">Card ····4821 · Jordan R.</p>
          <h2>Fuel-pump authorization</h2>
        </div>
        <button className="btn btn-dark">Freeze card</button>
      </section>

      <section className="hero-card" aria-label="Settlement amount">
        <p className="hero-eyebrow">Settled amount</p>
        <p className="hero-value">
          <CountUp value={73.4} prefix="$" />
        </p>
        <p className="hero-meta">Captured 2 days after a $50.00 authorization</p>
        <div className="hero-foot">
          <div className="hero-foot-item">
            <p className="hero-foot-label">Authorized</p>
            <p className="hero-foot-value tabular">$50.00</p>
          </div>
          <div className="hero-foot-item">
            <p className="hero-foot-label">Ledger effect</p>
            <p className="hero-foot-value tabular">$0.00</p>
          </div>
          <div className="hero-foot-item">
            <p className="hero-foot-label">Hold releases</p>
            <p className="hero-foot-value">Exactly once</p>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Event history</p>
            <h3>Provider events</h3>
          </div>
          <span className="chip chip-neutral">4 events</span>
        </div>
        {events.map((event) => (
          <div className="list-row" key={event.label}>
            <div className={`list-icon ${event.icon}`}>●</div>
            <div>
              <p className="list-title">{event.label}</p>
              <p className="list-meta">{event.detail}</p>
            </div>
            <div>
              <p className="list-value">{event.amount}</p>
              <p className="list-sub">
                <span className={`chip ${event.tag.tone}`}>{event.tag.text}</span>
              </p>
            </div>
          </div>
        ))}
      </section>

      <footer className="footer">
        <span>Value date Aug 21 · Booking date Aug 24</span>
        <span>Lithic sandbox · webhook-verified</span>
      </footer>
    </>
  );
}
