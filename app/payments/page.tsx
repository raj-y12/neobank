"use client";

import { useState } from "react";

export default function PaymentsPage() {
  const [recipient, setRecipient] = useState("Northstar Supplies");
  const [amount, setAmount] = useState("124000");
  const [message, setMessage] = useState("No payment created yet.");
  async function createPayment() {
    const response = await fetch("/api/payments", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ recipient, amountCents: Number(amount), idempotencyKey: `payment-${crypto.randomUUID()}` }) });
    const body = await response.json();
    setMessage(response.ok ? `${body.payment.status}: ${body.approvalRequired ? "waiting for a second human" : "submitted"}` : body.error);
  }
  return (
    <>
      <section className="intro">
        <div>
          <h2>Send money</h2>
          <p className="muted">Payments above $1,000 need a second approver.</p>
        </div>
      </section>

      <section className="panel">
        <h3>Payment details</h3>
        <div className="form-row">
          <label>Recipient<input className="input" value={recipient} onChange={(event) => setRecipient(event.target.value)} /></label>
          <label>Amount in cents<input className="input" value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="numeric" /></label>
          <button className="btn btn-primary" onClick={createPayment}>Send payment</button>
        </div>
        <p className="list-meta" role="status">{message}</p>
      </section>

      <section className="status-card">
        <div><strong>Payment rail</strong><p className="list-meta">Your payment will be submitted securely.</p></div>
        <span className="chip chip-orange">{process.env.NEXT_PUBLIC_INCREASE_MODE ?? "SIMULATED"}</span>
      </section>
    </>
  );
}
