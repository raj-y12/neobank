"use client";

import { useState } from "react";
import { DemoSession, demoHeaders, type DemoMember } from "../components/DemoSession";

export default function PaymentsPage() {
  const [member, setMember] = useState<DemoMember>("member-raj");
  const [recipient, setRecipient] = useState("Northstar Supplies");
  const [amount, setAmount] = useState("124000");
  const [message, setMessage] = useState("No payment created yet.");
  async function createPayment() {
    const response = await fetch("/api/payments", { method: "POST", headers: demoHeaders(member), body: JSON.stringify({ recipient, amountCents: Number(amount), idempotencyKey: `demo-payment-${Date.now()}` }) });
    const body = await response.json();
    setMessage(response.ok ? `${body.payment.status}: ${body.approvalRequired ? "waiting for a second human" : "submitted"}` : body.error);
  }
  return <main className="panel page-panel"><p className="eyebrow">Payments · Increase ACH</p><h1>Send money</h1><DemoSession onChange={setMember} /><p className="muted">Payments above $1,000 require a different business member. The initiator can never approve their own payment.</p><div className="form-row"><label>Recipient<input value={recipient} onChange={(event) => setRecipient(event.target.value)} /></label><label>Amount in cents<input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="numeric" /></label></div><button className="btn btn-primary" onClick={createPayment}>Create payment</button><div className="status-card"><div><strong>Provider submission</strong><p className="list-meta">Increase when configured; simulator otherwise</p></div><span className="chip chip-orange">{process.env.NEXT_PUBLIC_INCREASE_MODE ?? "SIMULATED"}</span></div><p className="list-meta" role="status">{message}</p></main>;
}
