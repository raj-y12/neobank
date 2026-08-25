import { ageBucket } from "@/src/domain/reconciliation";

export default function ReconciliationPage() {
  return <main className="panel page-panel"><p className="eyebrow">Nightly scheme file · ACH</p><h1>Reconciliation breaks</h1><p className="muted">Provider reports are evidence; the ledger remains customer truth. Breaks are never fixed by editing history.</p><div className="status-card"><div><strong>IN_FILE_NOT_LEDGER · col_ach_2048</strong><p className="list-meta">Provider: $2,800.00 · age {ageBucket("2026-08-24T00:00:00Z")}</p></div><span className="chip chip-orange">OPEN</span></div></main>;
}
