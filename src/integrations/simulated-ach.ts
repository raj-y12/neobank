import type { PaymentRail, RailTransfer } from "./payment-rail";
import { IncreaseAchRail } from "./increase/client";

export class SimulatedAchRail implements PaymentRail {
  readonly mode = "SIMULATED" as const;
  async createInbound(input: { amountCents: number; idempotencyKey: string; providerAccountId?: string; accountNumberId?: string; accountNumber?: string; routingNumber?: string }): Promise<RailTransfer> {
    return { providerTransferId: `sim-in-${input.idempotencyKey}`, status: "PENDING" };
  }
  async createOutbound(input: { amountCents: number; recipient: string; idempotencyKey: string; providerAccountId?: string; accountNumberId?: string; accountNumber?: string; routingNumber?: string }): Promise<RailTransfer> {
    if (input.amountCents <= 0 || !input.recipient) throw new Error("Invalid ACH transfer");
    return { providerTransferId: `sim-out-${input.idempotencyKey}`, status: "PENDING" };
  }
}

export function getPaymentRail(): PaymentRail {
  // Credentials alone must never enable live money movement. Live rail use is
  // an explicit deployment decision so local/demo tests remain simulated.
  if (process.env.PAYMENT_RAIL_MODE === "LIVE" && process.env.INCREASE_API_KEY && process.env.INCREASE_ACCOUNT_ID) {
    return new IncreaseAchRail();
  }
  return new SimulatedAchRail();
}
