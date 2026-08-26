"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { IconClose } from "../components/Icon";
import type { MembershipRole } from "@/src/domain/auth";
import { paymentStatusLabel } from "@/src/domain/payment-request-view";
import { formatEmployeeName } from "@/src/domain/team";

type Approval = { id: string; amount_cents: number; recipient: { name?: string } | string; initiator_member_id: string; status: string; standingOrder: { scheduled_date: string } | null; initiator: { id: string; first_name: string | null; last_name: string | null; email: string | null } | null };
type RequestView = { id: string; amountCents: number; recipient: string; status: Parameters<typeof paymentStatusLabel>[0]; createdAt: string };

export default function ApprovalsClient({ role }: { role: MembershipRole }) {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [requests, setRequests] = useState<RequestView[]>([]);
  const [message, setMessage] = useState("Loading approval queue…");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/approvals", { cache: "no-store" });
      const body = await response.json();
      setApprovals(body.approvals ?? []);
      setRequests(body.requests ?? []);
      setMessage(response.ok ? role === "ADMIN" ? `${body.approvals?.length ?? 0} payment(s) awaiting approval` : `${body.requests?.length ?? 0} request(s) found` : body.error);
    } catch { setMessage("Unable to load approvals. Try refreshing.");
    } finally { setLoading(false); }
  }, [role]);
  useEffect(() => { void load(); }, [load]);
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
        <h2>{role === "ADMIN" ? "Approvals" : "My requests"}</h2>
        <p className="muted">{role === "ADMIN" ? "Review payments waiting for your approval." : "Track payments you have sent for approval."}</p>
        </div>
      </section>

      <section className="panel">
        <div className="table-toolbar"><div className="panel-heading"><h3>{role === "ADMIN" ? "Waiting for approval" : "Payment requests"}</h3><span className="chip chip-orange">{role === "ADMIN" ? approvals.length : requests.length}</span></div></div>
        {loading ? <div className="skeleton-list" aria-label="Loading approvals" aria-busy="true"><span /><span /><span /></div> : role === "ADMIN" ? approvals.length === 0 ? <div className="empty-state"><h4>No pending approvals</h4><p>{message}</p></div> : (
          <table className="data-table">
            <thead><tr><th>Recipient</th><th>Initiated by</th><th>Status</th><th>Amount</th><th /></tr></thead>
            <tbody>
              {approvals.map((approval) => {
                const name = typeof approval.recipient === "string" ? approval.recipient : approval.recipient.name;
                return (
                  <tr key={approval.id}>
                    <td><span className="table-avatar">{(name ?? "?").slice(0, 1).toUpperCase()}</span>{name}</td>
                    <td>{approval.initiator ? formatEmployeeName({ id: approval.initiator.id, firstName: approval.initiator.first_name, lastName: approval.initiator.last_name, email: approval.initiator.email }) : approval.initiator_member_id}</td>
                    <td><span className={`table-status status-${approval.status.toLowerCase()}`}>{approval.status}</span>{approval.standingOrder && <span className="chip chip-neutral table-chip">Standing order · {approval.standingOrder.scheduled_date}</span>}</td>
                    <td className="tabular">${(approval.amount_cents / 100).toFixed(2)}</td>
                    <td><div className="form-row"><button className="btn btn-outline" onClick={() => approve(approval.id)}>Approve</button><button className="btn btn-ghost" onClick={() => reject(approval.id)}>Reject</button></div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : requests.length === 0 ? <div className="empty-state"><h4>No requests yet</h4><p>Payments you send will appear here.</p></div> : <table className="data-table"><thead><tr><th>Recipient</th><th>Created</th><th>Status</th><th>Amount</th></tr></thead><tbody>{requests.map((request) => <tr key={request.id}><td>{request.recipient}</td><td>{new Date(request.createdAt).toLocaleDateString("en-GB")}</td><td><span className={`table-status status-${request.status.toLowerCase().replaceAll("_", "-")}`}>{paymentStatusLabel(request.status)}</span></td><td className="tabular">${(request.amountCents / 100).toFixed(2)}</td></tr>)}</tbody></table>}
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
