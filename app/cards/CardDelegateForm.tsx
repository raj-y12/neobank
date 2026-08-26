"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { IconClose, IconUsers } from "../components/Icon";
import { formatEmployeeName } from "@/src/domain/team";

type Employee = { id: string; firstName: string | null; lastName: string | null; email: string | null; role: string; status: string };

export function CardDelegateForm({ cardToken, assignedMemberId, employees }: { cardToken: string; assignedMemberId: string | null; employees: Employee[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [memberId, setMemberId] = useState(assignedMemberId ?? "");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const assignedEmployee = employees.find((employee) => employee.id === assignedMemberId);

  async function delegate() {
    setPending(true);
    try {
      const response = await fetch(`/api/cards/${encodeURIComponent(cardToken)}/delegate`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ memberId }) });
      const body = await response.json() as { error?: string };
      setMessage(response.ok ? "Delegated" : body.error ?? "Unable to delegate card");
      if (response.ok) { router.refresh(); setOpen(false); }
    } catch { setMessage("Unable to delegate card. Try again."); }
    finally { setPending(false); }
  }

  return (
    <>
      <button className="btn btn-outline btn-block" onClick={() => setOpen(true)}>
        <IconUsers /> {assignedEmployee ? formatEmployeeName(assignedEmployee) : "Delegate this card"}
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
          <section className="transaction-modal" role="dialog" aria-modal="true" aria-labelledby="card-delegate-modal-title">
            <div className="modal-header">
              <div><p className="modal-context">Card access</p><h3 id="card-delegate-modal-title">Delegate this card</h3></div>
              <button className="modal-close" aria-label="Close delegate dialog" onClick={() => setOpen(false)}><IconClose /></button>
            </div>
            <p className="card-access-copy">Choose the active employee who should be able to use this card.</p>
            <div className="card-delegate-field" style={{ marginTop: "var(--space-4)" }}>
              <label htmlFor="card-delegate-select">Delegated to</label>
              <select id="card-delegate-select" className="select" value={memberId} onChange={(event) => setMemberId(event.target.value)} disabled={pending}>
                <option value="">Select employee</option>
                {employees.filter((employee) => employee.status === "ACTIVE").map((employee) => <option value={employee.id} key={employee.id}>{formatEmployeeName(employee)} · {employee.role}</option>)}
              </select>
            </div>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={delegate} disabled={!memberId || pending}>{pending ? "Saving…" : "Delegate"}</button>
              {message && <span className="list-meta" role="status">{message}</span>}
            </div>
          </section>
        </div>,
        document.body,
      )}
    </>
  );
}
