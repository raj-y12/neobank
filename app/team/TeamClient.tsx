"use client";

import { useEffect, useState } from "react";

type Employee = { id: string; email: string | null; role: "ADMIN" | "MEMBER"; status: string };

export function TeamClient() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"MEMBER" | "ADMIN">("MEMBER");
  const [message, setMessage] = useState("Loading employees…");

  async function load() {
    const response = await fetch("/api/employees", { cache: "no-store" });
    const body = await response.json() as { employees?: Employee[]; error?: string };
    setEmployees(body.employees ?? []);
    setMessage(response.ok ? `${body.employees?.length ?? 0} employee(s)` : body.error ?? "Unable to load employees");
  }

  useEffect(() => { void load(); }, []);

  async function invite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/employees", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, role }) });
    const body = await response.json() as { employee?: Employee; error?: string };
    setMessage(response.ok ? `Invitation sent to ${email}` : body.error ?? "Unable to invite employee");
    if (response.ok) { setEmail(""); await load(); }
  }

  return <>
    <form className="form-row" onSubmit={invite}><label>Employee email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="employee@business.com" required /></label><label>Role<select value={role} onChange={(event) => setRole(event.target.value as "MEMBER" | "ADMIN")}><option value="MEMBER">Member</option><option value="ADMIN">Admin</option></select></label><button className="btn btn-primary">Invite employee</button></form>
    <p className="list-meta" role="status">{message}</p>
    <div className="list-stack">{employees.map((employee) => <div className="status-card" key={employee.id}><div><strong>{employee.email ?? employee.id}</strong><p className="list-meta">{employee.role} · {employee.status}</p></div><span className="chip chip-orange">{employee.status}</span></div>)}</div>
  </>;
}
