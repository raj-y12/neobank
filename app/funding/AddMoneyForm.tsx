"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AddMoneyForm({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [amount, setAmount] = useState("500");
  const [fundingId, setFundingId] = useState<string | null>(null);
  const [message, setMessage] = useState(enabled ? "Ready to add money." : "Link a bank and complete verification first.");

  async function createFunding() {
    const amountCents = Math.round(Number(amount) * 100);
    if (!Number.isSafeInteger(amountCents) || amountCents <= 0) { setMessage("Enter a valid USD amount."); return; }
    const response = await fetch("/api/funding", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amountCents, idempotencyKey: `funding:${crypto.randomUUID()}` }) });
    const body = await response.json() as { error?: string; funding?: { id: string }; mode?: string };
    if (!response.ok || !body.funding) { setMessage(body.error ?? "Unable to create funding transfer"); return; }
    setFundingId(body.funding.id);
    setMessage(`Pending ${body.mode ?? "ACH"} transfer for $${(amountCents / 100).toFixed(2)} created. Available balance changes only after settlement.`);
  }

  async function simulate(status: "SETTLED" | "RETURNED") {
    if (!fundingId) return;
    setMessage(`Asking Increase sandbox to ${status === "SETTLED" ? "settle" : "return"} the transfer…`);
    const response = await fetch(`/api/funding/${fundingId}/simulate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: status === "SETTLED" ? "SETTLE" : "RETURN" }) });
    const body = await response.json() as { error?: string };
    if (!response.ok) { setMessage(body.error ?? "Unable to update funding transfer"); return; }
    for (let attempt = 0; attempt < 12; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const statusResponse = await fetch(`/api/funding/${fundingId}`, { cache: "no-store" });
      const statusBody = await statusResponse.json() as { funding?: { status?: string } };
      if (statusBody.funding?.status === status) {
        setMessage(`${status}: Increase webhook recorded the immutable ledger entry. Available balance is updated.`);
        router.refresh();
        return;
      }
    }
    setMessage(`Increase accepted the simulation. Waiting for the signed webhook; refresh shortly to see the ${status.toLowerCase()} balance.`);
  }

  return <div className="funding-actions"><div className="form-row"><label>Amount in USD<input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" disabled={!enabled} /></label><button className="btn btn-primary" onClick={createFunding} disabled={!enabled}>Add money</button></div><div className="form-row"><button className="btn btn-outline" onClick={() => simulate("SETTLED")} disabled={!fundingId}>Simulate settlement</button><button className="btn btn-outline" onClick={() => simulate("RETURNED")} disabled={!fundingId}>Simulate return</button></div><p className="list-meta" role="status">{message}</p></div>;
}
