import type { PaymentRail, RailTransfer } from "../payment-rail";

const BASE_URL = process.env.INCREASE_ENV === "production" ? "https://api.increase.com" : "https://sandbox.increase.com";

type IncreaseAchTransfer = { id: string; status?: string };

export class IncreaseAchRail implements PaymentRail {
  readonly mode = "LIVE" as const;

  private async createTransfer(input: { amountCents: number; idempotencyKey: string; accountNumber: string; routingNumber: string; statementDescriptor: string }): Promise<RailTransfer> {
    const apiKey = process.env.INCREASE_API_KEY;
    const accountId = process.env.INCREASE_ACCOUNT_ID;
    if (!apiKey || !accountId) throw new Error("Increase credentials are not configured");
    const response = await fetch(`${BASE_URL}/ach_transfers`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": input.idempotencyKey },
      body: JSON.stringify({ account_id: accountId, account_number: input.accountNumber, routing_number: input.routingNumber, amount: input.amountCents, statement_descriptor: input.statementDescriptor }),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Increase ACH request failed with ${response.status}`);
    const transfer = await response.json() as IncreaseAchTransfer;
    return { providerTransferId: transfer.id, status: "PENDING" };
  }

  createInbound(input: { amountCents: number; idempotencyKey: string; accountNumber?: string; routingNumber?: string }) {
    return this.createTransfer({ amountCents: -Math.abs(input.amountCents), idempotencyKey: input.idempotencyKey, accountNumber: input.accountNumber ?? process.env.INCREASE_FUNDING_ACCOUNT_NUMBER ?? "", routingNumber: input.routingNumber ?? process.env.INCREASE_FUNDING_ROUTING_NUMBER ?? "", statementDescriptor: "Neobank funding" });
  }

  createOutbound(input: { amountCents: number; recipient: string; idempotencyKey: string; accountNumber?: string; routingNumber?: string }) {
    return this.createTransfer({ amountCents: Math.abs(input.amountCents), idempotencyKey: input.idempotencyKey, accountNumber: input.accountNumber ?? process.env.INCREASE_RECIPIENT_ACCOUNT_NUMBER ?? "", routingNumber: input.routingNumber ?? process.env.INCREASE_RECIPIENT_ROUTING_NUMBER ?? "", statementDescriptor: input.recipient.slice(0, 200) });
  }
}

export function increaseConfigured() {
  return Boolean(process.env.INCREASE_API_KEY && process.env.INCREASE_ACCOUNT_ID);
}
