"use client";

import { useEffect, useState } from "react";
import { DemoSession, demoHeaders, type DemoMember } from "../components/DemoSession";

export default function OnboardingPage() {
  const [member, setMember] = useState<DemoMember>("member-raj");
  const [state, setState] = useState<{ business?: { legal_name: string; status: string }; verifications?: Array<{ subject_type: string; status: string; provider: string }> }>({});
  const [message, setMessage] = useState("Loading verification status…");
  async function load() { const response = await fetch("/api/onboarding", { headers: demoHeaders(member) }); const body = await response.json(); setState(body); setMessage(response.ok ? "Status loaded" : body.error); }
  useEffect(() => { void load(); }, [member]);
  async function approve() { const response = await fetch("/api/onboarding", { method: "POST", headers: demoHeaders(member), body: "{}" }); const body = await response.json(); setMessage(response.ok ? `Persona ${body.mode}: business approved` : body.error); if (response.ok) void load(); }
  return <main className="panel page-panel"><p className="eyebrow">Account opening · Persona KYB/KYC</p><h1>{state.business?.legal_name ?? "Business verification"}</h1><DemoSession onChange={setMember} /><p className="muted">Both the business and owner must be approved before funding, cards, or payments are enabled.</p>{(state.verifications ?? [{ subject_type: "BUSINESS", status: "PENDING", provider: "PERSONA" }, { subject_type: "OWNER", status: "PENDING", provider: "PERSONA" }]).map((item) => <div className="status-card" key={item.subject_type}><div><strong>{item.subject_type === "OWNER" ? "Owner / director" : "Business"}</strong><p className="list-meta">Provider: {item.provider}</p></div><span className={`chip ${item.status === "APPROVED" ? "chip-blue" : "chip-orange"}`}>{item.status}</span></div>)}<button className="btn btn-primary" onClick={approve}>Simulate Persona approval</button><p className="list-meta" role="status">{message}</p></main>;
}
