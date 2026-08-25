"use client";

import { useEffect, useState } from "react";
import type { LithicTransaction } from "@/src/integrations/lithic/client";

type TransactionRow = LithicTransaction & { displayAmount: number | null; internalTransactionId?: string };

function usd(amount: number | null | undefined) {
  if (amount === null || amount === undefined) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Math.abs(amount) / 100);
}

function date(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function latestEvent(transaction: TransactionRow) {
  return transaction.events?.at(-1);
}

export function TransactionActivity({ transactions }: { transactions: TransactionRow[] }) {
  const [selected, setSelected] = useState<TransactionRow | null>(null);
  const selectedEvents = selected ? [...(selected.events ?? [])].sort((a, b) => new Date(b.created ?? 0).getTime() - new Date(a.created ?? 0).getTime()) : [];

  useEffect(() => {
    if (!selected) return;
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && setSelected(null);
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [selected]);

  return (
    <>
      {transactions.length === 0 ? <div className="empty-state"><h4>No transactions recorded</h4><p>When Lithic receives an authorization or settlement for this card, it will appear here.</p></div> : transactions.map((transaction) => (
        <button className="list-row transaction-row" key={transaction.token} onClick={() => setSelected(transaction)}>
          <span className="list-icon is-blue">●</span>
          <span><span className="list-title transaction-title">{transaction.merchant_descriptor ?? transaction.merchant?.descriptor ?? "Card transaction"}</span><span className="list-meta">{latestEvent(transaction)?.type ?? "TRANSACTION"} · {transaction.status ?? "Unknown status"} · {date(transaction.updated ?? transaction.created)}</span></span>
          <span className="list-value">{usd(transaction.displayAmount)}</span>
        </button>
      ))}

      {selected && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setSelected(null)}>
        <section className="transaction-modal" role="dialog" aria-modal="true" aria-labelledby="transaction-modal-title">
          <div className="modal-header"><div><p className="eyebrow">Lithic transaction</p><h3 id="transaction-modal-title">{selected.merchant_descriptor ?? selected.merchant?.descriptor ?? "Card transaction"}</h3></div><button className="modal-close" aria-label="Close transaction details" onClick={() => setSelected(null)}>×</button></div>
          <div className="modal-status"><span className="chip chip-blue">{latestEvent(selected)?.type ?? "TRANSACTION"}</span><span className="chip chip-neutral">{selected.status ?? "Unknown status"}</span><strong>{usd(selected.displayAmount)}</strong></div>

          <div className="detail-grid">
            <div><span className="detail-label">Internal transaction ID</span><code>{selected.internalTransactionId ?? "—"}</code></div>
            <div><span className="detail-label">Provider transaction token</span><code>{selected.token}</code></div>
            <div><span className="detail-label">Card token</span><code>{selected.card_token ?? "—"}</code></div>
            <div><span className="detail-label">Created</span><span>{date(selected.created)}</span></div>
            <div><span className="detail-label">Updated</span><span>{date(selected.updated)}</span></div>
            <div><span className="detail-label">Authorization amount</span><span>{usd(selected.authorization_amount)}</span></div>
          </div>

          <div className="modal-section"><p className="eyebrow">Provider event timeline · newest first</p>{selectedEvents.map((event, index) => <div className="event-detail" key={`${event.type}-${event.created}-${index}`}><div><strong>{event.type}</strong><span>{event.result ?? ""}</span></div><time>{date(event.created)}</time><div className="event-amounts"><span>Hold {usd(event.amounts?.hold?.amount)}</span><span>Cardholder {usd(event.amounts?.cardholder?.amount)}</span><span>Settlement {usd(event.amounts?.settlement?.amount)}</span></div></div>)}</div>

          <div className="modal-section"><p className="eyebrow">Related internal transactions</p><p className="modal-note">These records come from our internal transaction projection for this card. Explicit reversal links will appear here once a reversal intent exists.</p>{transactions.filter((transaction) => transaction.token !== selected.token).map((transaction) => <button className="related-row" key={transaction.token} onClick={() => setSelected(transaction)}><span><strong>{transaction.merchant_descriptor ?? transaction.merchant?.descriptor ?? "Card transaction"}</strong><small>{latestEvent(transaction)?.type ?? "TRANSACTION"} · {transaction.status}</small></span><strong>{usd(transaction.displayAmount)}</strong></button>)}</div>
        </section>
      </div>}
    </>
  );
}
