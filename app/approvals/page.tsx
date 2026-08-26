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
  return (
    <>
      <section className="intro">
        <div>
          <h2>Approvals</h2>
          <p className="muted">Review payments waiting for your approval.</p>
        </div>
      </section>

      <section className="panel">
        <div className="table-toolbar">
          <div><h3>{approvals.length} waiting</h3></div>
        </div>
        {approvals.length === 0 ? <div className="empty-state"><h4>No pending approvals</h4><p>{message}</p></div> : (
          <table className="data-table">
            <thead><tr><th>Recipient</th><th>Initiated by</th><th>Status</th><th>Amount</th><th /></tr></thead>
            <tbody>
              {approvals.map((approval) => {
                const name = typeof approval.recipient === "string" ? approval.recipient : approval.recipient.name;
                return (
                  <tr key={approval.id}>
                    <td><span className="table-avatar">{(name ?? "?").slice(0, 1).toUpperCase()}</span>{name}</td>
                    <td>{approval.initiator_member_id}</td>
                    <td><span className={`table-status status-${approval.status.toLowerCase()}`}>{approval.status}</span></td>
                    <td className="tabular">${(approval.amount_cents / 100).toFixed(2)}</td>
                    <td><div className="form-row"><button className="btn btn-outline" onClick={() => approve(approval.id)}>Approve</button><button className="btn btn-ghost" onClick={() => reject(approval.id)}>Reject</button></div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <p className="list-meta" role="status">{message}</p>
      </section>
    </>
  );
}
