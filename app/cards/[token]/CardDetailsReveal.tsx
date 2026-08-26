"use client";

import LithicEmbed, { Environment, type CardEmbed } from "lithic-embed";
import { useEffect, useRef, useState, type ReactNode } from "react";

export function CardDetailsReveal({ cardToken, themeClass, children }: { cardToken: string; themeClass: string; children: ReactNode }) {
  const [revealed, setRevealed] = useState(false);
  const [session, setSession] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const embed = useRef<CardEmbed | null>(null);
  const pan = useRef<HTMLDivElement>(null);
  const cvv = useRef<HTMLDivElement>(null);
  const expMonth = useRef<HTMLDivElement>(null);
  const expYear = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!session) return;
    const sessionToken = session;
    let cancelled = false;
    async function mount() {
      try {
        const cardEmbed = new LithicEmbed(Environment.SANDBOX).card(sessionToken, { syncStyles: false });
        const cardFont = 'Geist, "Geist Fallback", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
        await cardEmbed.mount({
          pan: { element: pan.current!, styles: { color: "white", "font-family": cardFont, "font-size": "13px", "font-weight": "500", "letter-spacing": ".1em", "line-height": "28px" } },
          cvv: { element: cvv.current!, styles: { color: "white", "font-family": cardFont, "font-size": "12px", "font-weight": "500", "line-height": "24px" } },
          expMonth: { element: expMonth.current!, styles: { color: "white", "font-family": cardFont, "font-size": "12px", "font-weight": "500", "line-height": "24px" } },
          expYear: { element: expYear.current!, styles: { color: "white", "font-family": cardFont, "font-size": "12px", "font-weight": "500", "line-height": "24px" } },
        });
        await cardEmbed.toggleMasking();
        if (!cancelled) { embed.current = cardEmbed; setRevealed(true); setPending(false); }
      } catch (cause) {
        if (!cancelled) { setSession(null); setPending(false); setError(cause instanceof Error ? cause.message : "Unable to reveal card details"); }
      }
    }
    void mount();
    return () => { cancelled = true; void embed.current?.unmount(); embed.current = null; };
  }, [session]);

  useEffect(() => {
    if (!revealed) return;
    const timeout = window.setTimeout(hide, 9 * 60 * 1000);
    return () => window.clearTimeout(timeout);
  }, [revealed]);

  async function reveal() {
    setPending(true); setError(null);
    try {
      const response = await fetch(`/api/cards/${encodeURIComponent(cardToken)}/details-session`, { method: "POST" });
      const body = await response.json() as { session?: string; error?: string };
      if (!response.ok || !body.session) throw new Error(body.error ?? "Unable to reveal card details");
      setSession(body.session);
    } catch (cause) { setPending(false); setError(cause instanceof Error ? cause.message : "Unable to reveal card details"); }
  }

  function hide() {
    setRevealed(false); setSession(null); setPending(false); setError(null);
    void embed.current?.unmount(); embed.current = null;
  }

  return <div className={`card-reveal ${revealed ? "is-revealed" : ""}`}>
    <div className="card-reveal-inner">
      <div className="card-reveal-face card-reveal-front"><div className="card-reveal-card">{children}</div></div>
      <div className={`card-reveal-face card-reveal-back card-tile ${themeClass}`} aria-hidden={!revealed}>
        <div className="card-reveal-stripe" />
        <div className="card-reveal-signature"><span>AUTHORIZED CARDHOLDER</span><b>NOT VALID UNLESS SIGNED</b></div>
        <div className="card-reveal-details" aria-label="Secure card details">
          <div className="card-reveal-pan" ref={pan} />
          <div className="card-reveal-expiry"><div ref={expMonth} /><b>/</b><div ref={expYear} /></div>
          <div className="card-reveal-cvv" ref={cvv} />
        </div>
      </div>
    </div>
    <button className="btn btn-outline btn-block card-reveal-button" onClick={revealed ? hide : reveal} disabled={pending}>{pending ? "Preparing secure details…" : revealed ? "Hide card details" : "View card details"}</button>
    {error && <p className="form-error" role="alert">{error}</p>}
  </div>;
}
