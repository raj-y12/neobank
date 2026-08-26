"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Employee = { id: string; email: string | null; role: string; status: string };

export function CardDelegateForm({ cardToken, assignedMemberId, employees }: { cardToken: string; assignedMemberId: string | null; employees: Employee[] }) {
  const router = useRouter();
  const [memberId, setMemberId] = useState(assignedMemberId ?? "");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  async function delegate() {
    setPending(true);
    try {
      const response = await fetch(`/api/cards/${encodeURIComponent(cardToken)}/delegate`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ memberId }) });
      const body = await response.json() as { error?: string };
      setMessage(response.ok ? "Delegated" : body.error ?? "Unable to delegate card");
      if (response.ok) router.refresh();
    } catch { setMessage("Unable to delegate card. Try again."); }
    finally { setPending(false); }
  }
  return <div className="form-row card-delegate-row"><label>Delegated to<select className="select" value={memberId} onChange={(event) => setMemberId(event.target.value)} disabled={pending}><option value="">Select employee</option>{employees.filter((employee) => employee.status === "ACTIVE").map((employee) => <option value={employee.id} key={employee.id}>{employee.email ?? employee.id} · {employee.role}</option>)}</select></label><button className="btn btn-outline" onClick={delegate} disabled={!memberId || pending}>{pending ? "Saving…" : "Delegate"}</button>{message && <span className="list-meta" role="status">{message}</span>}</div>;
}
