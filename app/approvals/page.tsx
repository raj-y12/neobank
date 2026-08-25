"use client";

import { useEffect, useState } from "react";

type Approval = { id: string; amount_cents: number; recipient: { name?: string } | string; initiator_member_id: string; status: string };

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [message, setMessage] = useState("Loading approval queue…");
  async function load() {
    const response = await fetch("/api/approvals", { cache: "no-store" });
    const body = await response.json();
    setApprovals(body.approvals ?? []);
    setMessage(response.ok ? `${body.approvals?.length ?? 0} payment(s) awaiting approval` : body.error);
  }
  useEffect(() => { void load(); }, []);
  async function approve(id: string) {
    const response = await fetch(`/api/payments/${id}/approve`, { method: "POST" });
    const body = await response.json();
    setMessage(response.ok ? `Submitted to ${body.mode} rail as ${body.providerTransferId}` : body.error);
    if (response.ok) void load();
  }
  async function reject(id: string) {
    const response = await fetch(`/api/payments/${id}/reject`, { method: "POST" });
    const body = await response.json();
    setMessage(response.ok ? "Payment rejected" : body.error);
    if (response.ok) void load();
  }
  return <main className="panel page-panel"><p className="eyebrow">Maker-checker queue</p><h1>Approvals</h1><p className="muted">Admin approval is required above the threshold. The initiator cannot approve or reject their own payment.</p>{approvals.length === 0 ? <div className="empty-state"><h4>No pending approvals</h4><p>{message}</p></div> : approvals.map((approval) => <div className="status-card" key={approval.id}><div><strong>{typeof approval.recipient === "string" ? approval.recipient : approval.recipient.name}</strong><p className="list-meta">${(approval.amount_cents / 100).toFixed(2)} · initiated by {approval.initiator_member_id}</p></div><div className="form-row"><button className="btn btn-primary" onClick={() => approve(approval.id)}>Approve</button><button className="btn btn-outline" onClick={() => reject(approval.id)}>Reject</button></div></div>)}<p className="list-meta" role="status">{message}</p></main>;
}
