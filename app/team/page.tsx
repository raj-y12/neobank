import { TeamClient } from "./TeamClient";

export default function TeamPage() {
  return <main className="panel page-panel"><p className="eyebrow">Team · business access</p><h1>Employees</h1><p className="muted">Invite employees to your business and choose whether they can approve payments or use delegated cards.</p><TeamClient /></main>;
}
