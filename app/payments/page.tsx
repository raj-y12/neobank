"use client";

import { useState } from "react";

export default function PaymentsPage() {
  const [recipient, setRecipient] = useState("Northstar Supplies");
  const [accountNumber, setAccountNumber] = useState("");
  const [routingNumber, setRoutingNumber] = useState("");
  const [amount, setAmount] = useState("1240.00");
  const [message, setMessage] = useState("No payment created yet.");
  async function createPayment() {
    const response = await fetch("/api/payments", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ recipient, accountNumber, routingNumber, amountDollars: amount, idempotencyKey: `payment-${crypto.randomUUID()}` }) });
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
          <label>Amount in dollars<input className="input" value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" placeholder="0.00" /></label>
          <label>Account number<input className="input" value={accountNumber} onChange={(event) => setAccountNumber(event.target.value)} inputMode="numeric" autoComplete="off" /></label>
          <label>Routing number<input className="input" value={routingNumber} onChange={(event) => setRoutingNumber(event.target.value)} inputMode="numeric" autoComplete="off" /></label>
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
