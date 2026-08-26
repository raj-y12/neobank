"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { FundingFeedbackModal, fundingFailureMessage, type FundingFeedback } from "./FundingFeedbackModal";

export function AddMoneyForm({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [amount, setAmount] = useState("500");
  const [fundingId, setFundingId] = useState<string | null>(null);
  const [transferAmountCents, setTransferAmountCents] = useState(0);
  const [feedback, setFeedback] = useState<FundingFeedback | null>(null);
  const [busy, setBusy] = useState(false);

  async function createFunding() {
    const amountCents = Math.round(Number(amount) * 100);
    if (!Number.isSafeInteger(amountCents) || amountCents <= 0) {
      setFeedback({ status: "ERROR", amountCents: 0, operation: "CREATE", detail: "Enter an amount greater than $0" });
      return;
    }
    setBusy(true);
    setTransferAmountCents(amountCents);
    setFeedback({ status: "CREATING", amountCents, operation: "CREATE" });
    try {
      const response = await fetch("/api/funding", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amountCents, idempotencyKey: `funding:${crypto.randomUUID()}` }) });
      const body = await response.json() as { error?: string; funding?: { id: string }; mode?: string };
      if (!response.ok || !body.funding) {
        setFeedback({ status: "ERROR", amountCents, operation: "CREATE", detail: fundingFailureMessage("CREATE", body.error) });
        return;
      }
      setFundingId(body.funding.id);
      setFeedback({ status: "PENDING", amountCents, railMode: body.mode });
    } catch {
      setFeedback({ status: "ERROR", amountCents, operation: "CREATE", detail: "We couldn't reach the funding service. Check your connection and try again" });
    } finally {
      setBusy(false);
    }
  }

  async function simulate(status: "SETTLED" | "RETURNED") {
    if (!fundingId) return;
    const operation = status === "SETTLED" ? "SETTLE" as const : "RETURN" as const;
    setBusy(true);
    setFeedback({ status: status === "SETTLED" ? "SETTLING" : "RETURNING", amountCents: transferAmountCents, operation });
    try {
      const response = await fetch(`/api/funding/${fundingId}/simulate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: operation }) });
      const body = await response.json() as { error?: string };
      if (!response.ok) {
        setFeedback({ status: "ERROR", amountCents: transferAmountCents, operation, detail: fundingFailureMessage(operation, body.error) });
        return;
      }
      for (let attempt = 0; attempt < 12; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const statusResponse = await fetch(`/api/funding/${fundingId}`, { cache: "no-store" });
        const statusBody = await statusResponse.json() as { funding?: { status?: string } };
        if (statusBody.funding?.status === status) {
          setFeedback({ status, amountCents: transferAmountCents, operation });
          router.refresh();
          return;
        }
      }
      setFeedback({ status: "WAITING", amountCents: transferAmountCents, operation });
    } catch {
      setFeedback({ status: "ERROR", amountCents: transferAmountCents, operation, detail: "We couldn't reach the funding service. Check your connection and try again" });
    } finally {
      setBusy(false);
    }
  }

  return <div className="funding-actions"><div className="form-row"><label>Amount in USD<input className="input" value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" disabled={!enabled || busy} /></label><button className="btn btn-primary" onClick={createFunding} disabled={!enabled || busy}>{busy && feedback?.status === "CREATING" ? "Adding…" : "Add money"}</button></div><div className="form-row"><button className="btn btn-outline" onClick={() => simulate("SETTLED")} disabled={!fundingId || busy}>{busy && feedback?.status === "SETTLING" ? "Settling…" : "Simulate settlement"}</button><button className="btn btn-outline" onClick={() => simulate("RETURNED")} disabled={!fundingId || busy}>{busy && feedback?.status === "RETURNING" ? "Returning…" : "Simulate return"}</button></div>{feedback && typeof document !== "undefined" && createPortal(<div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setFeedback(null)}><FundingFeedbackModal feedback={feedback} onClose={() => setFeedback(null)} /></div>, document.body)}</div>;
}
