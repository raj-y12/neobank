"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { occurrenceStatusLabel, standingOrderFrequencyLabel, standingOrderRecipientName, type StandingOrderFrequency, type StandingOrderOccurrenceStatus } from "@/src/domain/standing-orders";
import { dollarsToCents } from "@/src/domain/money";
import { IconClose } from "../components/Icon";

type Payment = { id: string; status: string; amount_cents: number };
type Occurrence = { id: string; scheduled_date: string; status: StandingOrderOccurrenceStatus; payment_id: string | null; payment: Payment | null };
type StandingOrder = { id: string; amount_cents: number; recipient: { name: string; accountMask: string | null }; frequency: StandingOrderFrequency; next_run_date: string; insufficient_funds_policy: "SKIP" | "RETRY_NEXT_DAY"; status: "ACTIVE" | "PAUSED" | "CANCELED"; occurrences: Occurrence[] };

const initialForm = { amount: "100.00", recipient: "", accountNumber: "", routingNumber: "", frequency: "MONTHLY" as StandingOrderFrequency, nextRunDate: new Date().toISOString().slice(0, 10), policy: "SKIP" as "SKIP" | "RETRY_NEXT_DAY" };

export default function StandingOrdersClient() {
  const [orders, setOrders] = useState<StandingOrder[]>([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/standing-orders", { cache: "no-store" });
      const body = await response.json() as { standingOrders?: StandingOrder[]; error?: string };
      if (!response.ok) throw new Error(body.error ?? "Unable to load standing orders");
      setOrders(body.standingOrders ?? []);
    } catch (caught) { setErrorMessage(caught instanceof Error ? caught.message : "Unable to load standing orders"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function createOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setFormError(""); setMessage("");
    try {
      const response = await fetch("/api/standing-orders", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ amountCents: dollarsToCents(form.amount), recipient: form.recipient.trim(), accountNumber: form.accountNumber, routingNumber: form.routingNumber, frequency: form.frequency, nextRunDate: form.nextRunDate, insufficientFundsPolicy: form.policy }) });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Unable to create standing order");
      setForm(initialForm); setMessage("Standing order created"); await load();
    } catch (caught) { setFormError(caught instanceof Error ? caught.message : "Unable to create standing order"); }
    finally { setSaving(false); }
  }

  async function updateOrder(id: string, update: { status: "ACTIVE" | "PAUSED" | "CANCELED" }) {
    const response = await fetch(`/api/standing-orders/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(update) });
    const body = await response.json() as { error?: string };
    if (!response.ok) setErrorMessage(body.error ?? "Unable to update standing order");
    else { setMessage(`Standing order ${update.status.toLowerCase()}`); await load(); }
  }

  return <>
    <section className="intro"><div><p className="eyebrow">Scheduled payments</p><h2>Standing orders</h2><p className="intro-copy">Automate recurring ACH payments with a clear execution trail.</p></div></section>
    <section className="panel section-panel"><div className="panel-heading"><div><p className="eyebrow">New schedule</p><h3>Create a standing order</h3></div></div>
      <form className="form-row" onSubmit={createOrder}>
        <label>Recipient<input className="input" value={form.recipient} onChange={(event) => setForm({ ...form, recipient: event.target.value })} required placeholder="Vendor or supplier" /></label>
        <label>Account number<input className="input" value={form.accountNumber} onChange={(event) => setForm({ ...form, accountNumber: event.target.value })} inputMode="numeric" autoComplete="off" required /></label>
        <label>Routing number<input className="input" value={form.routingNumber} onChange={(event) => setForm({ ...form, routingNumber: event.target.value })} inputMode="numeric" autoComplete="off" required /></label>
        <label>Amount<span className="currency-input"><span aria-hidden="true">$</span><input className="input" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} inputMode="decimal" required /></span></label>
        <label>Frequency<select className="select" value={form.frequency} onChange={(event) => setForm({ ...form, frequency: event.target.value as StandingOrderFrequency })}><option value="DAILY">Daily</option><option value="WEEKLY">Weekly</option><option value="MONTHLY">Monthly</option></select></label>
        <label>First run<input className="input" type="date" value={form.nextRunDate} onChange={(event) => setForm({ ...form, nextRunDate: event.target.value })} required /></label>
        <label>If funds are short<select className="select" value={form.policy} onChange={(event) => setForm({ ...form, policy: event.target.value as typeof form.policy })}><option value="SKIP">Skip this run</option><option value="RETRY_NEXT_DAY">Retry tomorrow</option></select></label>
        <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? "Creating…" : "Create standing order"}</button>
        {formError && <p className="form-error" role="alert">{formError}</p>}
      </form>
    </section>
    {message && <p className="list-meta" role="status">{message}</p>}
    {loading ? <section className="panel empty-state" aria-busy="true">Loading standing orders…</section> : orders.length === 0 ? <section className="panel empty-state"><h4>No standing orders yet</h4><p>Create a recurring payment above to get started.</p></section> : <section className="standing-order-list" aria-label="Standing orders">{orders.map((order) => <article className="panel standing-order-card" key={order.id}>
      <div className="panel-heading"><div><p className="eyebrow">{standingOrderFrequencyLabel(order.frequency)} payment</p><h3>{standingOrderRecipientName(order.recipient)}</h3></div><span className={`chip ${order.status === "ACTIVE" ? "chip-green" : order.status === "PAUSED" ? "chip-orange" : "chip-neutral"}`}>{order.status}</span></div>
      <div className="standing-order-summary"><strong>${(order.amount_cents / 100).toFixed(2)}</strong><span>Next run {order.status === "ACTIVE" ? order.next_run_date : "Paused"}</span><span>{order.insufficient_funds_policy === "SKIP" ? "Skip if funds are short" : "Retry next day if funds are short"}</span>{order.recipient.accountMask && <span>ACH account {order.recipient.accountMask}</span>}</div>
      <div className="standing-order-actions">{order.status !== "ACTIVE" && order.status !== "CANCELED" && <button className="btn btn-outline" onClick={() => void updateOrder(order.id, { status: "ACTIVE" })}>Resume</button>}{order.status === "ACTIVE" && <button className="btn btn-outline" onClick={() => void updateOrder(order.id, { status: "PAUSED" })}>Pause</button>}{order.status !== "CANCELED" && <button className="btn btn-ghost" onClick={() => void updateOrder(order.id, { status: "CANCELED" })}>Cancel</button>}</div>
      {order.occurrences.length > 0 && <div className="standing-order-history"><p className="eyebrow">Execution history</p>{order.occurrences.slice(0, 8).map((occurrence) => <div className="standing-order-occurrence" key={occurrence.id}><span>{occurrence.scheduled_date}</span><span className={`chip ${occurrence.status === "SUBMITTED" ? "chip-blue" : occurrence.status === "PENDING_APPROVAL" ? "chip-orange" : occurrence.status === "INSUFFICIENT_FUNDS" ? "chip-red" : "chip-neutral"}`}>{occurrence.status === "PENDING_APPROVAL" ? "Approval required" : occurrenceStatusLabel(occurrence.status)}</span>{occurrence.payment && <small>Payment {occurrence.payment.id.slice(0, 8)} · {occurrence.payment.status}</small>}</div>)}</div>}
    </article>)}</section>}

    {errorMessage && typeof document !== "undefined" && createPortal(
      <div className="modal-backdrop is-centered" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setErrorMessage("")}>
        <div className="error-modal" role="alertdialog" aria-modal="true">
          <p>{errorMessage}</p>
          <div className="error-modal-icon" aria-hidden="true"><IconClose /></div>
        </div>
      </div>,
      document.body,
    )}
  </>;
}
