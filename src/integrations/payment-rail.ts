export type RailTransfer = {
  providerTransferId: string;
  status: "PENDING" | "SETTLED" | "RETURNED";
};

export interface PaymentRail {
  readonly mode: "LIVE" | "SIMULATED";
  createInbound(input: { amountCents: number; idempotencyKey: string; providerAccountId?: string; accountNumberId?: string; accountNumber?: string; routingNumber?: string }): Promise<RailTransfer>;
  createOutbound(input: { amountCents: number; recipient: string; idempotencyKey: string; providerAccountId?: string; accountNumberId?: string; accountNumber?: string; routingNumber?: string }): Promise<RailTransfer>;
}
