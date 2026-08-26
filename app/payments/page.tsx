"use client";

import { useEffect, useState } from "react";
import type { PaymentStatus } from "@/src/domain/payment-lifecycle";

export default function PaymentsPage() {
  const [recipient, setRecipient] = useState("Northstar Supplies");
  const [accountNumber, setAccountNumber] = useState("");
  const [routingNumber, setRoutingNumber] = useState("");
  const [amount, setAmount] = useState("1240.00");
  const [message, setMessage] = useState("No payment created yet.");
  const [payment, setPayment] = useState<{ id: string; status: PaymentStatus; amountCents: number } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [railMode, setRailMode] = useState(process.env.NEXT_PUBLIC_INCREASE_MODE ?? "SIMULATED");
  useEffect(() => {
    if (!payment || !modalOpen || payment.status === "SETTLED" || payment.status === "RETURNED" || payment.status === "REJECTED") return;
    const timer = window.setInterval(async () => {
      const response = await fetch(`/api/payments/${payment.id}`, { cache: "no-store" });
      if (!response.ok) return;
      const body = await response.json() as { payment?: { id: string; status: PaymentStatus; amountCents: number } };
      if (body.payment) {
        setPayment(body.payment);
        setMessage(`${body.payment.status}: ${body.payment.status === "PENDING_APPROVAL" ? "waiting for a second human" : body.payment.status.toLowerCase().replaceAll("_", " ")}`);
      }
    }, 3000);
    return () => window.clearInterval(timer);
  }, [payment, modalOpen]);
  async function createPayment() {
    const response = await fetch("/api/payments", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ recipient, accountNumber, routingNumber, amountDollars: amount, idempotencyKey: `payment-${crypto.randomUUID()}` }) });
    const body = await response.json();
    if (response.ok) {
      setPayment(body.payment);
      setRailMode(body.mode ?? "SIMULATED");
      setModalOpen(true);
      setMessage(`${body.payment.status}: ${body.approvalRequired ? "waiting for a second human" : "submitted"}`);
    } else setMessage(body.error);
  }
  return (
    <>
      <section className="intro">
        <div>
          <h2>Send money</h2>
          <p className="muted">Payments above $1,000 need a second approver.</p>
        </div>
      </section>

      <section className="status-card payment-rail-card">
        <div><strong>Payment rail</strong><p className="list-meta">Your payment will be submitted securely.</p></div>
        <span className="chip chip-orange">{railMode}</span>
      </section>

      <section className="panel payment-details-panel">
        <h3>Payment details</h3>
        <div className="form-row payment-form-row">
          <label>Recipient<input className="input" value={recipient} onChange={(event) => setRecipient(event.target.value)} /></label>
          <label>Account number<input className="input" value={accountNumber} onChange={(event) => setAccountNumber(event.target.value)} inputMode="numeric" autoComplete="off" /></label>
          <label>Routing number<input className="input" value={routingNumber} onChange={(event) => setRoutingNumber(event.target.value)} inputMode="numeric" autoComplete="off" /></label>
          <label>Amount in dollars<span className="currency-input"><span aria-hidden="true">$</span><input className="input" value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" placeholder="0.00" /></span></label>
        </div>
        <button className="btn btn-primary" onClick={createPayment}>Send payment</button>
        <p className="list-meta" role="status">{message}</p>
      </section>
      {modalOpen && payment && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setModalOpen(false)}>
        <section className="transaction-modal payment-status-modal" role="dialog" aria-modal="true" aria-labelledby="payment-status-title">
          <div className="modal-header"><div><p className="modal-context">Payment status</p><h3 id="payment-status-title">{statusTitle(payment.status)}</h3></div><button className="modal-close" aria-label="Close payment status" onClick={() => setModalOpen(false)}>×</button></div>
          <div className="modal-summary"><div><span className="detail-label">Current state</span><div className="modal-chips"><span className={`chip ${statusTone(payment.status)}`}>{payment.status.replaceAll("_", " ")}</span></div></div><div className="modal-amount"><span className="detail-label">Amount</span><strong>${(payment.amountCents / 100).toFixed(2)}</strong></div></div>
          <p className="modal-note">{statusMessage(payment.status)}</p>
          {(payment.status === "SUBMITTED" || payment.status === "APPROVED" || payment.status === "PENDING_APPROVAL") && <div className="payment-status-track"><span className="is-complete">Created</span><span className={payment.status === "PENDING_APPROVAL" ? "is-current" : "is-complete"}>{payment.status === "PENDING_APPROVAL" ? "Approval required" : "Submitted"}</span><span>Settled</span></div>}
        </section>
      </div>}
    </>
  );
}

function statusTitle(status: PaymentStatus) {
  if (status === "PENDING_APPROVAL") return "Waiting for approval";
  if (status === "APPROVED") return "Approved to send";
  if (status === "SUBMITTED") return "Payment on its way";
  if (status === "SETTLED") return "Payment settled";
  if (status === "RETURNED") return "Payment returned";
  return "Payment rejected";
}
function statusMessage(status: PaymentStatus) {
  if (status === "PENDING_APPROVAL") return "A second human must approve this payment before it can be submitted.";
  if (status === "APPROVED") return "The payment is approved and waiting for rail submission.";
  if (status === "SUBMITTED") return "We are waiting for the payment rail webhook to confirm settlement.";
  if (status === "SETTLED") return "The payment rail confirmed this payment as settled.";
  if (status === "RETURNED") return "The payment rail returned this payment. The ledger has recorded the correction.";
  return "This payment was rejected and was not submitted.";
}
function statusTone(status: PaymentStatus) {
  if (status === "SETTLED") return "chip-green";
  if (status === "RETURNED" || status === "REJECTED") return "chip-red";
  if (status === "SUBMITTED") return "chip-blue";
  return "chip-orange";
}
