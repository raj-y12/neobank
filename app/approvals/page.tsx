export default function ApprovalsPage() {
  return <main className="panel page-panel"><p className="eyebrow">Maker-checker queue</p><h1>Approvals</h1><p className="muted">Every approval is recorded with the initiator, approver, decision, and timestamp. Agent-created payments land here too.</p><div className="status-card"><div><strong>Northstar Supplies · $1,240.00</strong><p className="list-meta">Initiator: Raj · second human required</p></div><button className="btn btn-primary">Approve as second user</button></div></main>;
}
