"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { PaymentStatus } from "@/src/domain/payment-lifecycle";
import { IconArrowUp, IconCheck, IconClock, IconClose, IconUndo } from "../components/Icon";

export default function PaymentsPage() {
  const [recipient, setRecipient] = useState("Northstar Supplies");
  const [accountNumber, setAccountNumber] = useState("");
  const [routingNumber, setRoutingNumber] = useState("");
  const [amount, setAmount] = useState("1240.00");
  const [errorMessage, setErrorMessage] = useState("");
  const [payment, setPayment] = useState<{ id: string; status: PaymentStatus; amountCents: number } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [railMode, setRailMode] = useState(process.env.NEXT_PUBLIC_INCREASE_MODE ?? "SIMULATED");
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    if (!payment || !modalOpen || payment.status === "SETTLED" || payment.status === "RETURNED" || payment.status === "REJECTED") return;
    const timer = window.setInterval(async () => {
      const response = await fetch(`/api/payments/${payment.id}`, { cache: "no-store" });
      if (!response.ok) return;
      const body = await response.json() as { payment?: { id: string; status: PaymentStatus; amountCents: number } };
      if (body.payment) setPayment(body.payment);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [payment, modalOpen]);
  async function createPayment() {
    setSubmitting(true);
    try {
      const response = await fetch("/api/payments", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ recipient, accountNumber, routingNumber, amountDollars: amount, idempotencyKey: `payment-${crypto.randomUUID()}` }) });
      const body = await response.json();
      if (response.ok) {
        setPayment(body.payment);
        setRailMode(body.mode ?? "SIMULATED");
        setModalOpen(true);
      } else setErrorMessage(body.error);
    } catch { setErrorMessage("Unable to send payment. Check your connection and try again.");
    } finally { setSubmitting(false); }
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
        <button className="btn btn-primary" onClick={createPayment} disabled={submitting}>{submitting ? "Sending…" : "Send payment"}</button>
      </section>
      {modalOpen && payment && typeof document !== "undefined" && createPortal(
        <div className="modal-backdrop is-centered" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setModalOpen(false)}>
          <div className="error-modal" role="dialog" aria-modal="true" aria-labelledby="payment-status-title">
            <div key={payment.status} className="status-modal-swap">
              <p id="payment-status-title">{statusTitle(payment.status)}</p>
              <div className={`error-modal-icon ${statusIconTone(payment.status)}`} aria-hidden="true">{statusIcon(payment.status)}</div>
              <p className="modal-note">${(payment.amountCents / 100).toFixed(2)} · {statusMessage(payment.status)}</p>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {errorMessage && typeof document !== "undefined" && createPortal(
        <div className="modal-backdrop is-centered" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setErrorMessage("")}>
          <div className="error-modal" role="alertdialog" aria-modal="true">
            <p>{errorMessage}</p>
            <div className="error-modal-icon" aria-hidden="true"><IconClose /></div>
          </div>
        </div>,
        document.body,
      )}
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
function statusIconTone(status: PaymentStatus) {
  if (status === "SETTLED") return "is-success";
  if (status === "RETURNED" || status === "REJECTED") return "";
  if (status === "SUBMITTED") return "is-progress";
  return "is-pending";
}
function statusIcon(status: PaymentStatus) {
  if (status === "SETTLED") return <IconCheck />;
  if (status === "RETURNED") return <IconUndo />;
  if (status === "REJECTED") return <IconClose />;
  if (status === "SUBMITTED") return <IconArrowUp />;
  return <IconClock />;
}
