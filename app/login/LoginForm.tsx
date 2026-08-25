"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/src/lib/supabase/browser";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true); setError(null);
    const { error: signInError } = await createBrowserSupabaseClient().auth.signInWithPassword({ email, password });
    if (signInError) { setError(signInError.message); setLoading(false); return; }
    router.push("/");
    router.refresh();
  }

  return <form className="auth-form" onSubmit={submit}>
    <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" /></label>
    <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" /></label>
    <button className="btn btn-primary" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</button>
    {error && <p className="form-error" role="alert">{error}</p>}
  </form>;
}
