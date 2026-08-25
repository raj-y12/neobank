"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/src/lib/supabase/browser";

export function SignupForm() {
  const router = useRouter();
  const [legalName, setLegalName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const response = await fetch("/api/auth/signup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ legalName, email, password }) });
    const body = await response.json() as { error?: string };
    if (!response.ok) { setError(body.error ?? "Unable to create login"); setLoading(false); return; }
    const { error: signInError } = await createBrowserSupabaseClient().auth.signInWithPassword({ email, password });
    if (signInError) { setError(signInError.message); setLoading(false); return; }
    router.push("/onboarding");
    router.refresh();
  }

  return <form className="auth-form" onSubmit={submit} noValidate>
    <div className="auth-field"><label className="field-label" htmlFor="signup-business">Business name</label><input id="signup-business" className="input" value={legalName} onChange={(event) => setLegalName(event.target.value)} required autoComplete="organization" placeholder="Northstar Labs" /></div>
    <div className="auth-field"><label className="field-label" htmlFor="signup-email">Work email</label><input id="signup-email" className="input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" placeholder="you@business.com" /></div>
    <div className="auth-field"><label className="field-label" htmlFor="signup-password">Password</label><input id="signup-password" className="input" type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="new-password" placeholder="At least 8 characters" /></div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <button className="btn btn-outline btn-block" disabled={loading}>{loading ? "Creating login…" : "Create business login"}</button>
  </form>;
}
