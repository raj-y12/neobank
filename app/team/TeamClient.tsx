"use client";

import { useEffect, useState } from "react";

type Employee = { id: string; email: string | null; role: "ADMIN" | "MEMBER"; status: string };

export function TeamClient() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"MEMBER" | "ADMIN">("MEMBER");
  const [message, setMessage] = useState("Loading employees…");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/employees", { cache: "no-store" });
      const body = await response.json() as { employees?: Employee[]; error?: string };
      setEmployees(body.employees ?? []);
      setMessage(response.ok ? `${body.employees?.length ?? 0} employee(s)` : body.error ?? "Unable to load employees");
    } catch { setMessage("Unable to load employees. Try refreshing.");
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  async function invite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/employees", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, role, password }) });
    const body = await response.json() as { employee?: Employee; initialPassword?: string; error?: string };
    setMessage(response.ok ? `Login created for ${email}. Share the initial password securely: ${body.initialPassword}` : body.error ?? "Unable to create employee login");
    if (response.ok) { setEmail(""); setPassword(""); await load(); }
  }

  return <>
    <h3>Add an employee</h3>
    <form className="form-row" onSubmit={invite}>
      <label>Employee email<input className="input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="employee@business.com" required /></label>
      <label>Initial password<input className="input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" minLength={8} required /></label>
      <label>Role<select className="select" value={role} onChange={(event) => setRole(event.target.value as "MEMBER" | "ADMIN")}><option value="MEMBER">Member</option><option value="ADMIN">Admin</option></select></label>
      <button className="btn btn-primary">Create employee login</button>
    </form>
    <p className="list-meta" role="status">{message}</p>

    {loading ? <div className="skeleton-list" aria-label="Loading employees" aria-busy="true"><span /><span /><span /></div> : employees.length > 0 && (
      <table className="data-table">
        <thead><tr><th>Employee</th><th>Role</th><th>Status</th></tr></thead>
        <tbody>
          {employees.map((employee) => (
            <tr key={employee.id}>
              <td><span className="table-avatar">{(employee.email ?? "?").slice(0, 1).toUpperCase()}</span>{employee.email ?? employee.id}</td>
              <td>{employee.role}</td>
              <td><span className={`table-status status-${employee.status.toLowerCase()}`}>{employee.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </>;
}
