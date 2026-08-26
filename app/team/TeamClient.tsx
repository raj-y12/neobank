"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { IconClose } from "../components/Icon";

type Employee = { id: string; firstName: string | null; lastName: string | null; email: string | null; role: "ADMIN" | "MEMBER"; status: string };

export function TeamClient() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"MEMBER" | "ADMIN">("MEMBER");
  const [inviteMessage, setInviteMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/employees", { cache: "no-store" });
      const body = await response.json() as { employees?: Employee[]; error?: string };
      setEmployees(body.employees ?? []);
      setLoadError(response.ok ? "" : body.error ?? "Unable to load employees");
    } catch { setLoadError("Unable to load employees. Try refreshing.");
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  async function invite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/employees", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ firstName, lastName, email, role, password }) });
    const body = await response.json() as { employee?: Employee; initialPassword?: string; error?: string };
    if (response.ok) {
      setInviteMessage(`Login created for ${email}. Share the initial password securely: ${body.initialPassword}`);
      setFirstName(""); setLastName(""); setEmail(""); setPassword(""); await load();
    } else setErrorMessage(body.error ?? "Unable to create employee login");
  }

  return <>
    <section className="panel">
      <div className="panel-heading"><h3>Add an employee</h3></div>
      <form className="form-row" onSubmit={invite}>
        <label>First name<input className="input" value={firstName} onChange={(event) => setFirstName(event.target.value)} placeholder="Ada" required /></label>
        <label>Last name<input className="input" value={lastName} onChange={(event) => setLastName(event.target.value)} placeholder="Lovelace" required /></label>
        <label>Employee email<input className="input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="employee@business.com" required /></label>
        <label>Initial password<input className="input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" minLength={8} required /></label>
        <label>Role<select className="select" value={role} onChange={(event) => setRole(event.target.value as "MEMBER" | "ADMIN")}><option value="MEMBER">Member</option><option value="ADMIN">Admin</option></select></label>
        <button className="btn btn-primary">Create employee login</button>
      </form>
      {inviteMessage && <p className="list-meta" role="status">{inviteMessage}</p>}
    </section>

    <section className="panel">
      <div className="table-toolbar">
        <div className="panel-heading"><h3>Employees</h3><span className="chip chip-neutral">{employees.length}</span></div>
      </div>
      {loading ? <div className="skeleton-list" aria-label="Loading employees" aria-busy="true"><span /><span /><span /></div> : employees.length === 0 ? <div className="empty-state"><h4>No employees yet</h4><p>{loadError || "Add an employee above to get started."}</p></div> : (
        <table className="data-table">
          <thead><tr><th>Employee</th><th>Role</th><th>Status</th></tr></thead>
          <tbody>
            {employees.map((employee) => (
              <tr key={employee.id}>
                <td><span className="table-avatar">{(employee.firstName ?? employee.email ?? "?").slice(0, 1).toUpperCase()}</span>{[employee.firstName, employee.lastName].filter(Boolean).join(" ") || employee.email || employee.id}</td>
                <td>{employee.role}</td>
                <td><span className={`table-status status-${employee.status.toLowerCase()}`}>{employee.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
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
  </>;
}
