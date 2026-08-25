"use client";

import { useState } from "react";
import { DemoSession, demoHeaders, type DemoMember } from "../components/DemoSession";

export default function FundingPage() {
  const [member, setMember] = useState<DemoMember>("member-raj");
  const [amount, setAmount] = useState("50000");
  const [fundingId, setFundingId] = useState<string>();
  const [message, setMessage] = useState("No transfer created yet.");
  async function linkBank() {
    const response = await fetch("/api/funding/exchange", { method: "POST", headers: demoHeaders(member), body: JSON.stringify({ publicToken: "simulated_public_token", itemId: "item-demo", institutionName: "Chase", accountMask: "4821" }) });
    const body = await response.json();
    setMessage(response.ok ? `Linked ${body.account.institution_name} ···· ${body.account.account_mask} (${body.mode})` : body.error);
  }
  async function createFunding() {
    const response = await fetch("/api/funding", { method: "POST", headers: demoHeaders(member), body: JSON.stringify({ amountCents: Number(amount), linkedFundingAccountId: "00000000-0000-0000-0000-000000000001", idempotencyKey: `demo-funding-${Date.now()}` }) });
    const body = await response.json();
    setFundingId(body.funding?.id);
    setMessage(response.ok ? `Pending ${body.mode} transfer ${body.funding.id}` : body.error);
  }
  async function changeFunding(status: "SETTLED" | "RETURNED") {
    if (!fundingId) return;
    const response = await fetch("/api/webhooks/payment-rail", { method: "POST", headers: demoHeaders(member), body: JSON.stringify({ providerEventId: `demo-${fundingId}-${status.toLowerCase()}`, fundingTransferId: fundingId, status }) });
    const body = await response.json();
    setMessage(response.ok ? `${status}: ledger journal recorded` : body.error);
  }
  return <main className="panel page-panel"><p className="eyebrow">Fund account · Plaid + Increase ACH</p><h1>Add money</h1><DemoSession onChange={setMember} /><p className="muted">Linking identifies the external bank. Settlement is a separate event; pending funds do not increase available balance.</p><div className="status-card"><div><strong>Chase checking ···· 4821</strong><p className="list-meta">Plaid sandbox</p></div><button className="btn btn-outline" onClick={linkBank}>Link bank</button></div><div className="form-row"><label>Amount in cents<input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="numeric" /></label><button className="btn btn-primary" onClick={createFunding}>Create pending transfer</button></div><div className="form-row"><button className="btn btn-outline" disabled={!fundingId} onClick={() => changeFunding("SETTLED")}>Simulate settlement</button><button className="btn btn-outline" disabled={!fundingId} onClick={() => changeFunding("RETURNED")}>Simulate return</button></div><p className="list-meta" role="status">{message}</p></main>;
}
