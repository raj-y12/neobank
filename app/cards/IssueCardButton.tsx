"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { IconClose } from "../components/Icon";

type Employee = { id: string; email: string | null; role: string; status: string };
const DURATIONS = [["TRANSACTION", "Per transaction"], ["MONTHLY", "Monthly"], ["ANNUALLY", "Annually"], ["FOREVER", "Lifetime"]] as const;

export function IssueCardButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [memberId, setMemberId] = useState("");
  const [limit, setLimit] = useState("");
  const [duration, setDuration] = useState("TRANSACTION");
  const [pending, setPending] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  async function openModal() {
    setError(""); setOpen(true); setLoadingEmployees(true);
    try {
      const response = await fetch("/api/employees", { cache: "no-store" });
      const body = await response.json() as { employees?: Employee[]; error?: string };
      if (!response.ok) throw new Error(body.error ?? "Unable to load employees");
      setEmployees((body.employees ?? []).filter((employee) => employee.status === "ACTIVE"));
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Unable to load employees"); }
    finally { setLoadingEmployees(false); }
  }

  async function issueCard(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setPending(true);
    try {
      const response = await fetch("/api/cards", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ memberId, limit, duration }) });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Unable to issue card");
      setOpen(false); setMemberId(""); setLimit(""); setDuration("TRANSACTION"); router.refresh();
    } catch (issueError) { setError(issueError instanceof Error ? issueError.message : "Unable to issue card"); }
    finally { setPending(false); }
  }

  return <div className="action-stack">
    <button className="btn btn-secondary" onClick={async () => { setError(""); setPending(true); try { const response = await fetch("/api/cards/sync", { method: "POST" }); const body = await response.json() as { error?: string }; if (!response.ok) throw new Error(body.error ?? "Unable to sync cards"); router.refresh(); } catch (syncError) { setError(syncError instanceof Error ? syncError.message : "Unable to sync cards"); } finally { setPending(false); } }} disabled={pending}>{pending ? "Working…" : "Sync existing cards"}</button>
    <button className="btn btn-primary" onClick={openModal} disabled={pending}>Issue card</button>
    {error && !open && <p className="form-error" role="alert">{error}</p>}
    {open && typeof document !== "undefined" && createPortal(<div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
      <section className="transaction-modal issue-card-modal" role="dialog" aria-modal="true" aria-labelledby="issue-card-modal-title">
        <div className="modal-header"><div><p className="modal-context">New team card</p><h3 id="issue-card-modal-title">Issue a card</h3></div><button className="modal-close" aria-label="Close issue card dialog" onClick={() => setOpen(false)}><IconClose /></button></div>
        <p className="card-access-copy">Choose who can use this virtual card and set its spending guardrail.</p>
        <form className="issue-card-form" onSubmit={issueCard}>
          <label htmlFor="issue-card-member">Delegated to<select id="issue-card-member" className="select" value={memberId} onChange={(event) => setMemberId(event.target.value)} disabled={pending || loadingEmployees} required><option value="">{loadingEmployees ? "Loading employees…" : "Select an employee"}</option>{employees.map((employee) => <option value={employee.id} key={employee.id}>{employee.email ?? employee.id} · {employee.role}</option>)}</select></label>
          <div className="issue-card-limit-row"><label htmlFor="issue-card-limit">Spending limit<span className="currency-input"><span aria-hidden="true">$</span><input id="issue-card-limit" className="input" inputMode="decimal" type="text" value={limit} onChange={(event) => setLimit(event.target.value)} placeholder="0.00" required /></span></label><label htmlFor="issue-card-duration">Resets<select id="issue-card-duration" className="select" value={duration} onChange={(event) => setDuration(event.target.value)} disabled={pending}>{DURATIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label></div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="modal-actions"><button type="button" className="btn btn-ghost" onClick={() => setOpen(false)} disabled={pending}>Cancel</button><button type="submit" className="btn btn-primary" disabled={pending || loadingEmployees || !employees.length}>{pending ? "Issuing…" : "Issue card"}</button></div>
        </form>
      </section>
    </div>, document.body)}
  </div>;
}
