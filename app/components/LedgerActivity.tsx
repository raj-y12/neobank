"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { LedgerStatementRow } from "@/src/domain/ledger-statement";
import { formatUsdCents } from "@/src/integrations/lithic/client";
import { IconArrowDown, IconArrowUp, IconClock, IconClose, IconDollar, IconUndo } from "./Icon";

const labels: Record<string, string> = {
  OPENING_BALANCE: "Opening balance",
  CARD_AUTHORIZATION_HOLD: "Card authorization hold",
  CARD_CLEARING: "Card settlement",
  CARD_AUTHORIZATION_REVERSAL: "Hold released",
  CARD_SETTLEMENT_REVERSAL: "Settlement reversed",
};

function readableEntry(type: string) {
  return labels[type] ?? type.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}

function signedAmount(amount: number) {
  const prefix = amount > 0 ? "+" : amount < 0 ? "−" : "";
  return `${prefix}${formatUsdCents(Math.abs(amount))}`;
}

function iconFor(type: string, amount: number) {
  if (type === "OPENING_BALANCE") return <IconDollar />;
  if (type.includes("REVERSAL")) return <IconUndo />;
  if (type === "CARD_AUTHORIZATION_HOLD") return <IconClock />;
  return amount >= 0 ? <IconArrowDown /> : <IconArrowUp />;
}

export function LedgerActivity({ rows }: { rows: LedgerStatementRow[] }) {
  const [selected, setSelected] = useState<LedgerStatementRow | null>(null);

  useEffect(() => {
    if (!selected) return;
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && setSelected(null);
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [selected]);

  return <>
    <div>
      {rows.map((row) => {
        const amount = row.availableBalanceImpactCents;
        const incoming = amount >= 0;
        return <button className="list-row transaction-row ledger-row" key={row.journalEntryId} onClick={() => setSelected(row)} aria-label={`${readableEntry(row.entryType)} ${formatTime(row.bookingTimestamp)} ${signedAmount(amount)}`}>
          <span className={`list-icon transaction-icon${incoming ? " is-incoming" : ""}`} aria-hidden="true">{iconFor(row.entryType, amount)}</span>
          <span className="transaction-copy"><span className="transaction-primary"><span className="list-title transaction-title">{readableEntry(row.entryType)}</span></span><span className="transaction-meta">{formatTime(row.bookingTimestamp)}</span></span>
          <span className={`transaction-amount ${incoming ? "amount-positive" : "amount-negative"}`}>{signedAmount(amount)}</span>
        </button>;
      })}
    </div>

    {selected && typeof document !== "undefined" && createPortal(<div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setSelected(null)}>
      <section className="transaction-modal ledger-detail-modal" role="dialog" aria-modal="true" aria-labelledby="ledger-detail-title">
        <div className="modal-header"><div><p className="modal-context">Ledger activity</p><h3 id="ledger-detail-title">{readableEntry(selected.entryType)}</h3></div><button className="modal-close" aria-label="Close ledger details" onClick={() => setSelected(null)}><IconClose /></button></div>
        <div className="modal-summary"><div><span className="detail-label">Entry</span><div className="modal-chips"><span className="chip chip-neutral">{selected.entryType.replaceAll("_", " ")}</span></div></div><div className="modal-amount"><span className="detail-label">Balance change</span><strong className={selected.availableBalanceImpactCents >= 0 ? "amount-positive" : "amount-negative"}>{signedAmount(selected.availableBalanceImpactCents)}</strong></div></div>
        <div className="detail-grid consumer-details"><div><span className="detail-label">Date</span><span>{formatTime(selected.bookingTimestamp)}</span></div><div><span className="detail-label">Reference</span><code>{selected.referenceId ?? selected.journalEntryId}</code></div></div>
      </section>
    </div>, document.body)}
  </>;
}
