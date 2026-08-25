import type { PaymentRail, RailTransfer } from "./payment-rail";
import { IncreaseAchRail } from "./increase/client";

export class SimulatedAchRail implements PaymentRail {
  readonly mode = "SIMULATED" as const;
  async createInbound(input: { amountCents: number; idempotencyKey: string; accountNumber?: string; routingNumber?: string }): Promise<RailTransfer> {
    return { providerTransferId: `sim-in-${input.idempotencyKey}`, status: "PENDING" };
  }
  async createOutbound(input: { amountCents: number; recipient: string; idempotencyKey: string; accountNumber?: string; routingNumber?: string }): Promise<RailTransfer> {
    if (input.amountCents <= 0 || !input.recipient) throw new Error("Invalid ACH transfer");
    return { providerTransferId: `sim-out-${input.idempotencyKey}`, status: "PENDING" };
  }
}

export function getPaymentRail(): PaymentRail {
  // The live Column adapter can be selected once credentials and the account
  // mapping are configured. Until then this path is intentionally explicit.
  if (process.env.INCREASE_API_KEY && process.env.INCREASE_ACCOUNT_ID) {
    return new IncreaseAchRail();
  }
  return new SimulatedAchRail();
}
