import { IconClose } from "../components/Icon";

export type FundingFeedback = {
  status: "CREATING" | "PENDING" | "SETTLING" | "SETTLED" | "RETURNING" | "RETURNED" | "WAITING" | "ERROR";
  amountCents: number;
  railMode?: string;
  operation?: "CREATE" | "SETTLE" | "RETURN";
  detail?: string;
};

export function fundingFeedbackContent(_feedback: FundingFeedback) {
  const feedback = _feedback;
  const amount = usd(feedback.amountCents);
  const provider = feedback.railMode === "SIMULATED" ? "The simulator" : "Increase";

  if (feedback.status === "CREATING") return { title: "Creating transfer", stateLabel: "CREATING", tone: "chip-blue", message: `Sending ${amount} to ${provider}. Keep this window open.` };
  if (feedback.status === "PENDING") return { title: "Transfer created", stateLabel: "PENDING", tone: "chip-orange", message: `${provider} accepted the ${amount} transfer. Simulate settlement to add it to your available balance.` };
  if (feedback.status === "SETTLING") return { title: "Settling transfer", stateLabel: "SETTLING", tone: "chip-blue", message: `${provider} is processing settlement. This usually takes a few seconds.` };
  if (feedback.status === "SETTLED") return { title: "Money added", stateLabel: "SETTLED", tone: "chip-green", message: `${provider} confirmed settlement. ${amount} is now included in your available balance.` };
  if (feedback.status === "RETURNING") return { title: "Returning transfer", stateLabel: "RETURNING", tone: "chip-blue", message: `${provider} is processing the return. This usually takes a few seconds.` };
  if (feedback.status === "RETURNED") return { title: "Transfer returned", stateLabel: "RETURNED", tone: "chip-red", message: `${provider} confirmed the return. The ledger recorded the corresponding balance change.` };
  if (feedback.status === "WAITING") {
    const returning = feedback.operation === "RETURN";
    return {
      title: returning ? "Return still processing" : "Settlement still processing",
      stateLabel: "PROCESSING",
      tone: "chip-orange",
      message: `${provider} accepted the simulation, but confirmation has not arrived yet. Close this window and refresh shortly.`,
    };
  }
  return {
    title: feedback.operation === "CREATE" ? "Transfer not created" : feedback.operation === "RETURN" ? "Return not completed" : "Settlement not completed",
    stateLabel: "ACTION NEEDED",
    tone: "chip-red",
    message: fundingFailureMessage(feedback.operation ?? "CREATE", feedback.detail),
  };
}

export function fundingFailureMessage(operation: "CREATE" | "SETTLE" | "RETURN", detail?: string) {
  if (detail && !/Increase request failed|unknown error/i.test(detail)) return withPeriod(detail);
  if (operation === "CREATE") return "Increase couldn't create this transfer. Check the amount and linked account, then try again.";
  if (operation === "RETURN") return "Increase couldn't return this transfer. Close this message and try again.";
  return "Increase couldn't settle this transfer. Close this message, create a fresh transfer, and try again.";
}

export function FundingFeedbackModal({ feedback, onClose, onSimulateSettlement, onSimulateReturn }: { feedback: FundingFeedback; onClose: () => void; onSimulateSettlement?: () => void; onSimulateReturn?: () => void }) {
  const content = fundingFeedbackContent(feedback);
  const busy = feedback.status === "CREATING" || feedback.status === "SETTLING" || feedback.status === "RETURNING";
  const canSimulate = (feedback.status === "PENDING" || feedback.status === "WAITING") && onSimulateSettlement && onSimulateReturn;
  return (
    <section className="transaction-modal payment-status-modal" role="dialog" aria-modal="true" aria-labelledby="funding-status-title" aria-busy={busy || undefined}>
      <div className="modal-header">
        <div><p className="modal-context">Funding status</p><h3 id="funding-status-title">{content.title}</h3></div>
        <button className="modal-close" aria-label="Close funding status" onClick={onClose}><IconClose /></button>
      </div>
      <div className="modal-summary">
        <div><span className="detail-label">Current state</span><div className="modal-chips"><span className={`chip ${content.tone}`}>{content.stateLabel}</span></div></div>
        <div className="modal-amount"><span className="detail-label">Amount</span><strong>{usd(feedback.amountCents)}</strong></div>
      </div>
      <p className="modal-note" role={feedback.status === "ERROR" ? "alert" : "status"}>{content.message}</p>
      {canSimulate && (
        <div className="modal-actions">
          <button className="btn btn-outline" onClick={onSimulateSettlement} disabled={busy}>Simulate settlement</button>
          <button className="btn btn-outline" onClick={onSimulateReturn} disabled={busy}>Simulate return</button>
        </div>
      )}
    </section>
  );
}

function usd(amountCents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amountCents / 100);
}

function withPeriod(message: string) {
  return /[.!?]$/.test(message) ? message : `${message}.`;
}
