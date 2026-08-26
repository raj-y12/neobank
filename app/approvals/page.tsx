"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { IconClose } from "../components/Icon";

type Approval = { id: string; amount_cents: number; recipient: { name?: string } | string; initiator_member_id: string; status: string };

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [message, setMessage] = useState("Loading approval queue…");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(true);
  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/approvals", { cache: "no-store" });
      const body = await response.json();
      setApprovals(body.approvals ?? []);
      setMessage(response.ok ? `${body.approvals?.length ?? 0} payment(s) awaiting approval` : body.error);
    } catch { setMessage("Unable to load approvals. Try refreshing.");
    } finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  async function approve(id: string) {
    const response = await fetch(`/api/payments/${id}/approve`, { method: "POST" });
    const body = await response.json();
    if (response.ok) { setMessage(`Submitted to ${body.mode} rail as ${body.providerTransferId}`); void load(); }
    else setErrorMessage(body.error);
  }
  async function reject(id: string) {
    const response = await fetch(`/api/payments/${id}/reject`, { method: "POST" });
    const body = await response.json();
    if (response.ok) { setMessage("Payment rejected"); void load(); }
    else setErrorMessage(body.error);
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
        {loading ? <div className="skeleton-list" aria-label="Loading approvals" aria-busy="true"><span /><span /><span /></div> : approvals.length === 0 ? <div className="empty-state"><h4>No pending approvals</h4><p>{message}</p></div> : (
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
