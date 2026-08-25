"use client";

import { useEffect, useState } from "react";
import { DemoSession, demoHeaders, type DemoMember } from "../components/DemoSession";

export default function AccountPage() {
  const [member, setMember] = useState<DemoMember>("member-raj");
  const [data, setData] = useState<any>();
  const [message, setMessage] = useState("Loading account…");
  async function load() { const response = await fetch("/api/account", { headers: demoHeaders(member) }); const body = await response.json(); setData(body); setMessage(response.ok ? "Account loaded from Supabase" : body.error); }
  useEffect(() => { void load(); }, [member]);
  return <main className="panel page-panel"><p className="eyebrow">Business current account</p><h1>{data?.business?.legal_name ?? "Account"}</h1><DemoSession onChange={setMember} /><div className="status-card"><div><strong>Account status</strong><p className="list-meta">{data?.business?.status ?? "—"} · {data?.accountId ?? "—"}</p></div><span className="chip chip-blue">USD</span></div><div className="status-card"><div><strong>Linked external bank</strong><p className="list-meta">{data?.linkedBank ? `${data.linkedBank.institution_name} ···· ${data.linkedBank.account_mask}` : "No bank linked"}</p></div><a className="btn btn-outline" href="/funding">Manage</a></div><div className="status-card"><div><strong>Ledger balance</strong><p className="list-meta">${((data?.balances?.ledgerBalanceCents ?? 0) / 100).toFixed(2)}</p></div><div><strong>Available</strong><p className="list-meta">${((data?.balances?.availableBalanceCents ?? 0) / 100).toFixed(2)}</p></div></div><p className="list-meta" role="status">{message}</p></main>;
}
