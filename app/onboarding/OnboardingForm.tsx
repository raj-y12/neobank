"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function OnboardingForm({ existing }: { existing: { businessName: string; ownerName: string; ownerEmail: string } | null }) {
  const router = useRouter();
  const [businessName, setBusinessName] = useState(existing?.businessName ?? "");
  const [ownerName, setOwnerName] = useState(existing?.ownerName ?? "");
  const [ownerEmail, setOwnerEmail] = useState(existing?.ownerEmail ?? "");
  const [links, setLinks] = useState<{ business: string | null; owner: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(null); setLoading(true);
    try {
      const response = await fetch("/api/onboarding/persona", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ businessName, ownerName, ownerEmail }) });
      const body = await response.json() as { error?: string; links?: { business: string | null; owner: string | null } };
      if (!response.ok) throw new Error(body.error ?? "Unable to start verification");
      setLinks(body.links ?? null); router.refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to start verification"); }
    finally { setLoading(false); }
  }

  return <div className="onboarding-form-wrap">
    <form className="onboarding-form" onSubmit={submit}>
      <label className="field-label" htmlFor="business-name">Business name</label><input className="input" id="business-name" value={businessName} onChange={(event) => setBusinessName(event.target.value)} required disabled={Boolean(existing)} />
      <label className="field-label" htmlFor="owner-name">Owner or director name</label><input className="input" id="owner-name" value={ownerName} onChange={(event) => setOwnerName(event.target.value)} required disabled={Boolean(existing)} />
      <label className="field-label" htmlFor="owner-email">Owner or director email</label><input className="input" id="owner-email" type="email" value={ownerEmail} onChange={(event) => setOwnerEmail(event.target.value)} required disabled={Boolean(existing)} />
      {!existing && <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? "Starting verification…" : "Start Persona verification"}</button>}
    </form>
    {links && <div className="verification-links"><p className="eyebrow">Sandbox verification link</p><p>Open the link, complete the Persona KYC flow with test data, then return here.</p>{links.owner && <a className="btn btn-outline" href={links.owner} target="_blank" rel="noreferrer">Complete verification</a>}</div>}
    {error && <p className="form-error" role="alert">{error}</p>}
  </div>;
}
