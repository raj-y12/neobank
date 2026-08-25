"use client";

import { useState } from "react";

export function AddMoneyForm({ enabled }: { enabled: boolean }) {
  const [amount, setAmount] = useState("50000");
  const [fundingId, setFundingId] = useState<string | null>(null);
  const [message, setMessage] = useState(enabled ? "Ready to add money." : "Link a bank and complete verification first.");

  async function createFunding() {
    const response = await fetch("/api/funding", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amountCents: Number(amount), idempotencyKey: `funding:${crypto.randomUUID()}` }) });
    const body = await response.json() as { error?: string; funding?: { id: string }; mode?: string };
    if (!response.ok || !body.funding) { setMessage(body.error ?? "Unable to create funding transfer"); return; }
    setFundingId(body.funding.id);
    setMessage(`Pending ${body.mode ?? "ACH"} transfer created. Available balance changes only after settlement.`);
  }

  async function simulate(status: "SETTLED" | "RETURNED") {
    if (!fundingId) return;
    const response = await fetch("/api/webhooks/payment-rail", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ providerEventId: `demo:${fundingId}:${status}`, fundingTransferId: fundingId, status }) });
    const body = await response.json() as { error?: string };
    setMessage(response.ok ? `${status}: immutable ledger entry recorded.` : body.error ?? "Unable to update funding transfer");
  }

  return <div className="funding-actions"><div className="form-row"><label>Amount in cents<input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="numeric" disabled={!enabled} /></label><button className="btn btn-primary" onClick={createFunding} disabled={!enabled}>Add money</button></div><div className="form-row"><button className="btn btn-outline" onClick={() => simulate("SETTLED")} disabled={!fundingId}>Simulate settlement</button><button className="btn btn-outline" onClick={() => simulate("RETURNED")} disabled={!fundingId}>Simulate return</button></div><p className="list-meta" role="status">{message}</p></div>;
}
