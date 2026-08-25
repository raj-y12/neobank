"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { formatLithicDate, type LithicTransaction } from "@/src/integrations/lithic/client";

type TransactionRow = LithicTransaction & { displayAmount: number | null; internalTransactionId?: string; reversalOfTransactionId?: string };

function usd(amount: number | null | undefined) {
  if (amount === null || amount === undefined) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Math.abs(amount) / 100);
}

function isIncoming(transaction: TransactionRow) {
  return latestEvent(transaction)?.type === "RETURN" || transaction.status === "UNMATCHED_RETURN";
}

function signedUsd(amount: number | null | undefined, incoming: boolean) {
  if (amount === null || amount === undefined) return "—";
  return `${incoming ? "+" : "−"}${usd(amount)}`;
}

function date(value: string | null | undefined) {
  return formatLithicDate(value);
}

function latestEvent(transaction: TransactionRow) {
  return transaction.events?.at(-1);
}

export function TransactionActivity({ transactions }: { transactions: TransactionRow[] }) {
  const [selected, setSelected] = useState<TransactionRow | null>(null);
  const [reversalIntentId, setReversalIntentId] = useState<string | null>(null);
  const [providerReturnToken, setProviderReturnToken] = useState("");
  const [returnAmountDollars, setReturnAmountDollars] = useState("");
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const selectedEvents = selected ? [...(selected.events ?? [])].sort((a, b) => new Date(b.created ?? 0).getTime() - new Date(a.created ?? 0).getTime()) : [];
  const relatedTransactions = selected?.internalTransactionId
    ? transactions.filter((transaction) => transaction.reversalOfTransactionId === selected.internalTransactionId || selected.reversalOfTransactionId === transaction.internalTransactionId)
    : [];
  const canLinkReturn = selected?.status === "SETTLED" && latestEvent(selected)?.type === "CLEARING" && Boolean(selected.internalTransactionId);

  async function createReversalIntent() {
    if (!selected?.internalTransactionId) return;
    setLinkError(null);
    setLinking(true);
    try {
      const response = await fetch("/api/card-reversal-intents", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ originalTransactionId: selected.internalTransactionId, idempotencyKey: `ui:${selected.internalTransactionId}` }),
      });
      const body = await response.json() as { intent?: { id: string; expectedAmountCents: number }; error?: string };
      if (!response.ok || !body.intent) throw new Error(body.error ?? "Unable to create reversal intent");
      setReversalIntentId(body.intent.id);
      setReturnAmountDollars((body.intent.expectedAmountCents / 100).toFixed(2));
    } catch (error) {
      setLinkError(error instanceof Error ? error.message : "Unable to create reversal intent");
    } finally {
      setLinking(false);
    }
  }

  async function linkReturn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reversalIntentId || !selected?.card_token) return;
    setLinkError(null);
    setLinking(true);
    try {
      const returnAmountCents = Math.round(Number(returnAmountDollars) * 100);
      const response = await fetch(`/api/card-reversal-intents/${reversalIntentId}/link`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ providerReturnTransactionId: providerReturnToken, returnCardToken: selected.card_token, returnAmountCents }),
      });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Unable to link return");
      window.location.reload();
    } catch (error) {
      setLinkError(error instanceof Error ? error.message : "Unable to link return");
      setLinking(false);
    }
  }

  useEffect(() => {
    if (!selected) return;
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && setSelected(null);
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [selected]);

  return (
    <>
      {transactions.length === 0 ? <div className="empty-state"><h4>No transactions recorded</h4><p>When Lithic receives an authorization or settlement for this card, it will appear here.</p></div> : transactions.map((transaction) => (
        <button className="list-row transaction-row" key={transaction.token} onClick={() => { setSelected(transaction); setReversalIntentId(null); setLinkError(null); }}>
          <span className="list-icon is-blue">●</span>
          <span><span className="list-title transaction-title">{transaction.merchant_descriptor ?? transaction.merchant?.descriptor ?? "Card transaction"}</span><span className="list-meta">{latestEvent(transaction)?.type ?? "TRANSACTION"} · {transaction.status ?? "Unknown status"} · {date(transaction.updated ?? transaction.created)}</span></span>
          <span className={`list-value ${isIncoming(transaction) ? "amount-positive" : "amount-negative"}`}>{signedUsd(transaction.displayAmount, isIncoming(transaction))}</span>
        </button>
      ))}

      {selected && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setSelected(null)}>
        <section className="transaction-modal" role="dialog" aria-modal="true" aria-labelledby="transaction-modal-title">
          <div className="modal-header"><div><p className="eyebrow">Transaction details</p><h3 id="transaction-modal-title">{selected.merchant_descriptor ?? selected.merchant?.descriptor ?? "Card transaction"}</h3></div><button className="modal-close" aria-label="Close transaction details" onClick={() => setSelected(null)}>×</button></div>
          <div className="modal-summary"><div><span className="detail-label">Latest event</span><div className="modal-chips"><span className="chip chip-blue">{latestEvent(selected)?.type ?? "TRANSACTION"}</span><span className="chip chip-neutral">{selected.status ?? "Unknown status"}</span></div></div><div className="modal-amount"><span className="detail-label">{isIncoming(selected) ? "Money in" : "Money out"}</span><strong className={isIncoming(selected) ? "amount-positive" : "amount-negative"}>{signedUsd(selected.displayAmount, isIncoming(selected))}</strong></div></div>

          <div className="modal-actions">
            {selected.internalTransactionId && <Link className="btn btn-ghost" href={`/statements/card/${selected.internalTransactionId}`}>Open statement</Link>}
            {canLinkReturn && !reversalIntentId && <button className="btn btn-outline" onClick={createReversalIntent} disabled={linking}>{linking ? "Preparing…" : "Link return"}</button>}
          </div>

          <div className="detail-grid consumer-details">
            <div><span className="detail-label">Transaction ID</span><code>{selected.internalTransactionId ?? "—"}</code></div>
            <div><span className="detail-label">Created</span><span>{date(selected.created)}</span></div>
          </div>

          <div className="modal-section"><div className="modal-section-heading"><div><p className="eyebrow">Event timeline</p></div><span className="chip chip-neutral">{selectedEvents.length}</span></div>{selectedEvents.map((event, index) => <div className="event-detail" key={`${event.type}-${event.created}-${index}`}><div className="event-title"><span className="event-marker" aria-hidden="true" /><div><strong>{event.type}</strong><span>{event.result ?? ""}</span></div></div><time>{date(event.created)}</time><div className="event-amounts"><span>Hold {usd(event.amounts?.hold?.amount)}</span><span>Cardholder {usd(event.amounts?.cardholder?.amount)}</span><span>Settlement {usd(event.amounts?.settlement?.amount)}</span></div></div>)}</div>

          {relatedTransactions.length > 0 && <div className="modal-section"><div className="modal-section-heading"><div><p className="eyebrow">Related transactions</p></div></div>{relatedTransactions.map((transaction) => <button className="related-row" key={transaction.token} onClick={() => { setSelected(transaction); setReversalIntentId(null); }}><span><strong>{transaction.merchant_descriptor ?? transaction.merchant?.descriptor ?? "Card transaction"}</strong><small>{latestEvent(transaction)?.type ?? "TRANSACTION"} · {transaction.status} · {date(transaction.updated ?? transaction.created)}</small></span><strong className={isIncoming(transaction) ? "amount-positive" : "amount-negative"}>{signedUsd(transaction.displayAmount, isIncoming(transaction))}</strong></button>)}</div>}

          {reversalIntentId && <div className="modal-section"><p className="eyebrow">Link a return</p><form className="reversal-link-form" onSubmit={linkReturn}><p className="modal-note">Simulate the return in Lithic, then paste its provider transaction token here.</p><label className="detail-label" htmlFor="provider-return-token">Lithic return transaction token</label><input id="provider-return-token" value={providerReturnToken} onChange={(event) => setProviderReturnToken(event.target.value)} required placeholder="Lithic transaction token" /><label className="detail-label" htmlFor="return-amount">Return amount (USD)</label><input id="return-amount" inputMode="decimal" value={returnAmountDollars} onChange={(event) => setReturnAmountDollars(event.target.value)} required /><button className="btn btn-primary" type="submit" disabled={linking}>{linking ? "Linking…" : "Confirm link"}</button></form>{linkError && <p className="form-error">{linkError}</p>}</div>}
        </section>
      </div>}
    </>
  );
}
