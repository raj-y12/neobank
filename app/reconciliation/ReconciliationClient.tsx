"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { IconClose } from "../components/Icon";

type Break = { id: string; break_type: string; provider_reference: string; expected_amount_cents?: number; actual_amount_cents?: number; status: string; ageBucket: string };

export default function ReconciliationPage() {
  const [breaks, setBreaks] = useState<Break[]>([]);
  const [message, setMessage] = useState("No file loaded.");
  const [errorMessage, setErrorMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/agent/reconciliation-breaks", { cache: "no-store" });
      const body = await response.json();
      setBreaks(body.breaks ?? []);
      if (response.ok) setMessage(`${body.breaks?.length ?? 0} break(s) loaded`);
      else setErrorMessage(body.error);
    } catch { setErrorMessage("Unable to load reconciliation breaks. Try refreshing.");
    } finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  async function uploadFile() {
    if (!file) { setErrorMessage("Choose an Increase transaction CSV first."); return; }
    const response = await fetch("/api/reconciliation", { method: "POST", headers: { "content-type": "text/csv", "x-file-reference": file.name }, body: await file.text() });
    const body = await response.json();
    if (response.ok) { setMessage(`Imported ${file.name}: ${body.breakCount} break(s)`); void load(); }
    else setErrorMessage(body.error);
  }
  async function plantBreak() {
    const response = await fetch("/api/reconciliation", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ fileReference: `increase-demo-${Date.now()}`, providerRows: [{ referenceId: `increase-missing-${Date.now()}`, amountCents: 280000 }], ledgerRows: [] }) });
    const body = await response.json();
    if (response.ok) { setMessage(`Planted ${body.breakCount} break(s)`); void load(); }
    else setErrorMessage(body.error);
  }
  const openCount = breaks.filter((item) => item.status === "OPEN").length;
  async function resolve(id: string) {
    const response = await fetch(`/api/reconciliation/${id}`, { method: "PATCH" });
    const body = await response.json();
    if (response.ok) { setMessage("Break resolved without editing the ledger"); void load(); }
    else setErrorMessage(body.error);
  }
  return (
    <>
      <section className="intro">
        <div>
          <h2>Reconciliation breaks</h2>
          <p className="muted">Review differences between provider reports and the ledger.</p>
        </div>
      </section>

      <section className="panel">
        <div className="table-toolbar">
          <div><h3>{openCount} open</h3></div>
          <div className="table-toolbar-actions">
            <label className="btn btn-outline">Choose CSV<input type="file" accept=".csv,text/csv" onChange={(event) => setFile(event.target.files?.[0] ?? null)} hidden /></label>
            <button className="btn btn-primary" onClick={uploadFile} disabled={!file}>Import file</button>
            <button className="btn btn-outline" onClick={load}>Refresh</button>
            <button className="btn btn-primary" onClick={plantBreak}>Add test break</button>
          </div>
        </div>
        {loading ? <div className="skeleton-list" aria-label="Loading reconciliation breaks" aria-busy="true"><span /><span /><span /></div> : breaks.length === 0 ? <div className="empty-state"><h4>No breaks</h4><p>{message}</p></div> : (
          <table className="data-table">
            <thead><tr><th>Break</th><th>Reference</th><th>Amount</th><th>Age</th><th>Status</th><th /></tr></thead>
            <tbody>
              {breaks.map((item) => (
                <tr key={item.id}>
                  <td>{item.break_type}</td>
                  <td>{item.provider_reference}</td>
                  <td className="tabular">${((item.actual_amount_cents ?? item.expected_amount_cents ?? 0) / 100).toFixed(2)}</td>
                  <td>{item.ageBucket}</td>
                  <td><span className={`table-status status-${item.status.toLowerCase()}`}>{item.status}</span></td>
                  <td>{item.status === "OPEN" && <button className="btn btn-outline" onClick={() => resolve(item.id)}>Resolve</button>}</td>
                </tr>
              ))}
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
