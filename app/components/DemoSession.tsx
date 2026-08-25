"use client";

import { useState } from "react";

export type DemoMember = "member-raj" | "member-aya";

export function DemoSession({ onChange }: { onChange?: (member: DemoMember) => void }) {
  const [member, setMember] = useState<DemoMember>("member-raj");
  function change(next: DemoMember) { setMember(next); onChange?.(next); }
  return <div className="status-card"><div><strong>Demo business</strong><p className="list-meta">Switch user to test maker-checker</p></div><label className="list-meta">Acting as <select value={member} onChange={(event) => change(event.target.value as DemoMember)}><option value="member-raj">Raj · ADMIN</option><option value="member-aya">Aya · MEMBER</option></select></label></div>;
}

export function demoHeaders(member: DemoMember = "member-raj") {
  return { "content-type": "application/json", "x-business-id": "demo-business", "x-account-id": "demo-account", "x-member-id": member, "x-member-role": member === "member-raj" ? "ADMIN" : "MEMBER" };
}
