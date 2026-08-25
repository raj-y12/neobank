"use client";

import Script from "next/script";
import { useState } from "react";
import { useRouter } from "next/navigation";

declare global { interface Window { Plaid?: { create: (config: { token: string; onSuccess: (publicToken: string, metadata: { institution?: { institution_id?: string; name?: string }; account?: { name?: string; mask?: string } }) => void; onExit?: () => void }) => { open: () => void } } } }

export function PlaidLinkButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function linkBank() {
    setLoading(true); setError(null);
    try {
      const response = await fetch("/api/funding/link-token", { method: "POST" });
      const body = await response.json() as { linkToken?: string; error?: string };
      if (!response.ok || !body.linkToken) throw new Error(body.error ?? "Unable to start Plaid Link");
      if (!window.Plaid) throw new Error("Plaid Link is still loading; try again in a moment");
      const handler = window.Plaid.create({ token: body.linkToken, onSuccess: async (publicToken, metadata) => {
        try {
          const exchange = await fetch("/api/funding/exchange", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ publicToken, accountName: metadata.account?.name, accountMask: metadata.account?.mask }) });
          const result = await exchange.json() as { error?: string };
          if (!exchange.ok) throw new Error(result.error ?? "Unable to save linked bank");
          router.refresh();
        } catch (caught) {
          setError(caught instanceof Error ? caught.message : "Unable to save linked bank");
        } finally { setLoading(false); }
      }, onExit: () => setLoading(false) });
      handler.open();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to link bank"); setLoading(false); }
  }

  return <><Script src="https://cdn.plaid.com/link/v2/stable/link-initialize.js" strategy="afterInteractive" /><button className="btn btn-primary" onClick={linkBank} disabled={loading}>{loading ? "Opening Plaid…" : "Link checking account"}</button>{error && <p className="form-error" role="alert">{error}</p>}</>;
}
