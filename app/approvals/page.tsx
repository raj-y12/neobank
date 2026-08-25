"use client";

import { useEffect, useState } from "react";
import { DemoSession, demoHeaders, type DemoMember } from "../components/DemoSession";

type Approval = { id: string; amount_cents: number; recipient: { name?: string } | string; initiator_member_id: string; status: string };

export default function ApprovalsPage() {
  const [member, setMember] = useState<DemoMember>("member-raj");
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [message, setMessage] = useState("Loading approval queue…");
  async function load() {
    const response = await fetch("/api/approvals", { headers: demoHeaders(member) });
    const body = await response.json();
    setApprovals(body.approvals ?? []);
    setMessage(response.ok ? `${body.approvals?.length ?? 0} payment(s) awaiting approval` : body.error);
  }
  useEffect(() => { void load(); }, [member]);
  async function approve(id: string) {
    const response = await fetch(`/api/payments/${id}/approve`, { method: "POST", headers: demoHeaders(member), body: "{}" });
    const body = await response.json();
    setMessage(response.ok ? `Submitted to ${body.mode} rail as ${body.providerTransferId}` : body.error);
    if (response.ok) void load();
  }
  return <main className="panel page-panel"><p className="eyebrow">Maker-checker queue</p><h1>Approvals</h1><DemoSession onChange={setMember} /><p className="muted">Switch to Aya to approve Raj’s payment. Staying as Raj demonstrates the self-approval rejection.</p>{approvals.length === 0 ? <div className="empty-state"><h4>No pending approvals</h4><p>{message}</p></div> : approvals.map((approval) => <div className="status-card" key={approval.id}><div><strong>{typeof approval.recipient === "string" ? approval.recipient : approval.recipient.name}</strong><p className="list-meta">${(approval.amount_cents / 100).toFixed(2)} · initiated by {approval.initiator_member_id}</p></div><button className="btn btn-primary" onClick={() => approve(approval.id)}>Approve</button></div>)}<p className="list-meta" role="status">{message}</p></main>;
}
