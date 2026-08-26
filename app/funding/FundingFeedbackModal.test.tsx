import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FundingFeedbackModal, fundingFeedbackContent, fundingFailureMessage } from "./FundingFeedbackModal";

describe("funding feedback", () => {
  it("presents a created transfer as pending and names the next action", () => {
    const content = fundingFeedbackContent({ status: "PENDING", amountCents: 50_000, railMode: "LIVE" });

    expect(content).toEqual({
      title: "Transfer created",
      stateLabel: "PENDING",
      tone: "chip-orange",
      message: "Increase accepted the $500.00 transfer. Simulate settlement to add it to your available balance.",
    });
  });

  it("confirms only settled money as available", () => {
    expect(fundingFeedbackContent({ status: "SETTLED", amountCents: 50_000 }).message).toBe(
      "Increase confirmed settlement. $500.00 is now included in your available balance.",
    );
  });

  it("renders lifecycle feedback in the existing status dialog", () => {
    const markup = renderToStaticMarkup(
      <FundingFeedbackModal feedback={{ status: "RETURNED", amountCents: 50_000 }} onClose={() => undefined} />,
    );

    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('aria-modal="true"');
    expect(markup).toContain("Transfer returned");
    expect(markup).not.toContain("Ready to add money");
  });

  it("turns raw Increase errors into actionable product copy", () => {
    expect(fundingFailureMessage("SETTLE", "Increase request failed with 404: unknown error")).toBe(
      "Increase couldn't settle this transfer. Close this message, create a fresh transfer, and try again.",
    );
    expect(fundingFailureMessage("CREATE", "Business verification must be approved before funding")).toBe(
      "Business verification must be approved before funding.",
    );
  });
});
