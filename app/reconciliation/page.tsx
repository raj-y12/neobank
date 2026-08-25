"use client";

import { useEffect, useState } from "react";

type Break = { id: string; break_type: string; provider_reference: string; expected_amount_cents?: number; actual_amount_cents?: number; status: string; ageBucket: string };

export default function ReconciliationPage() {
  const [breaks, setBreaks] = useState<Break[]>([]);
  const [message, setMessage] = useState("No file loaded.");
  async function load() {
    const response = await fetch("/api/agent/reconciliation-breaks", { cache: "no-store" });
    const body = await response.json();
    setBreaks(body.breaks ?? []);
    setMessage(response.ok ? `${body.breaks?.length ?? 0} break(s) loaded` : body.error);
  }
  useEffect(() => { void load(); }, []);
  async function plantBreak() {
    const response = await fetch("/api/reconciliation", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ fileReference: `increase-demo-${Date.now()}`, providerRows: [{ referenceId: `increase-missing-${Date.now()}`, amountCents: 280000 }], ledgerRows: [] }) });
    const body = await response.json();
    setMessage(response.ok ? `Planted ${body.breakCount} break(s)` : body.error);
    if (response.ok) void load();
  }
  async function resolve(id: string) {
    const response = await fetch(`/api/reconciliation/${id}`, { method: "PATCH" });
    const body = await response.json();
    setMessage(response.ok ? "Break resolved without editing the ledger" : body.error);
    if (response.ok) void load();
  }
  return <main className="panel page-panel"><p className="eyebrow">Nightly scheme file · Increase ACH</p><h1>Reconciliation breaks</h1><p className="muted">Provider reports are evidence; the ledger remains customer truth. Breaks are never fixed by editing history.</p><div className="form-row"><button className="btn btn-primary" onClick={plantBreak}>Plant demo break</button><button className="btn btn-outline" onClick={load}>Refresh breaks</button></div>{breaks.length === 0 ? <div className="empty-state"><h4>No breaks</h4><p>{message}</p></div> : breaks.map((item) => <div className="status-card" key={item.id}><div><strong>{item.break_type} · {item.provider_reference}</strong><p className="list-meta">${((item.actual_amount_cents ?? item.expected_amount_cents ?? 0) / 100).toFixed(2)} · age {item.ageBucket}</p></div>{item.status === "OPEN" && <button className="btn btn-outline" onClick={() => resolve(item.id)}>Resolve</button>}</div>)}<p className="list-meta" role="status">{message}</p></main>;
}
