import { createMcpHandler, McpServer, type McpRequestContext } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { createPayment } from "../domain/payment-lifecycle";
import { validateAchBankDetails } from "../domain/ach";
import { dollarsToCents } from "../domain/money";
import { ageBucket } from "../domain/reconciliation";
import { getPublicApiScope } from "../lib/public-api-auth";
import { toPublicPayment } from "../lib/public-api-payment";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseLedgerRepository } from "../repositories/supabase-ledger-repository";
import { createSupabasePaymentRepository } from "../repositories/supabase-payment-repository";
import { getBusinessCardAssignment, listBusinessCardAssignments } from "../repositories/supabase-business-card-repository";
import { getLithicCard } from "../integrations/lithic/client";

function result(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value) }] };
}

async function makeServer(ctx: McpRequestContext) {
  const request = ctx.requestInfo;
  if (!request) throw new Error("MCP request context is unavailable");
  const scope = await getPublicApiScope(request);
  const server = new McpServer({ name: "neobank", version: "1.0.0" }, { capabilities: { tools: {} } });

  server.registerTool("get_account_summary", { title: "Get account summary", description: "Read the authenticated business ledger and available balance. Admin only." }, async () => {
    if (scope.role !== "ADMIN") return result({ error: "ADMIN role required" });
    const balances = await createSupabaseLedgerRepository().getBalances({ businessId: scope.businessId, accountId: scope.accountId });
    return result({ businessId: scope.businessId, accountId: scope.accountId, currency: "USD", balances });
  });

  server.registerTool("list_cards", { title: "List cards", description: "List cards assigned to the authenticated business. Members see only their own cards; PAN and CVV are never returned." }, async () => {
    const assignments = await listBusinessCardAssignments(scope.businessId);
    const cards = scope.role === "MEMBER" ? assignments.filter((card) => card.memberId === scope.memberId) : assignments;
    return result({ cards });
  });

  server.registerTool("get_card", { title: "Get card", description: "Read card status and assignment metadata. PAN and CVV are never returned.", inputSchema: { token: z.string().min(1) } }, async ({ token }) => {
    const card = await getBusinessCardAssignment(scope.businessId, token);
    if (!card || (scope.role === "MEMBER" && card.memberId !== scope.memberId)) return result({ error: "Card not found" });
    const providerCard = await getLithicCard(token);
    return result({ card, provider: { lastFour: providerCard.last_four, state: providerCard.state, type: providerCard.type, spendLimit: providerCard.spend_limit, spendLimitDuration: providerCard.spend_limit_duration } });
  });

  server.registerTool("get_payment", { title: "Get payment", description: "Read a payment and its current status.", inputSchema: { id: z.string().min(1) } }, async ({ id }) => {
    const payment = await createSupabasePaymentRepository().get(id, scope.businessId);
    if (!payment || (scope.role === "MEMBER" && payment.initiatorId !== scope.memberId)) return result({ error: "Payment not found" });
    return result({ payment: toPublicPayment(payment) });
  });

  server.registerTool("create_payment", {
    title: "Create payment",
    description: "Preview an ACH payment first. Set confirmed=true only after the user has reviewed and approved the preview. The payment enters the normal approval queue.",
    inputSchema: {
      amountDollars: z.string().min(1), recipient: z.string().min(1), accountNumber: z.string().min(1), routingNumber: z.string().min(1), idempotencyKey: z.string().min(1), confirmed: z.boolean().default(false),
    },
  }, async ({ amountDollars, recipient, accountNumber, routingNumber, idempotencyKey, confirmed }) => {
    validateAchBankDetails(accountNumber, routingNumber);
    const amountCents = dollarsToCents(amountDollars);
    const preview = { amountDollars, recipient, rail: "ACH", approval: "human approval required", idempotencyKey };
    if (!confirmed) return result({ requiresConfirmation: true, preview });
    const payment = createPayment({ businessId: scope.businessId, accountId: scope.accountId, initiatorId: scope.memberId, amountCents, currency: "USD", rail: "ACH", recipient, recipientBank: { accountNumber, routingNumber }, approvalMode: "HUMAN" });
    const repository = createSupabasePaymentRepository();
    const persisted = await repository.create(payment, idempotencyKey);
    await repository.reserveFunds(persisted);
    return result({ requiresConfirmation: false, payment: toPublicPayment(persisted), providerSubmitted: false, queue: "approval" });
  });

  server.registerTool("list_reconciliation_breaks", { title: "List reconciliation breaks", description: "Read reconciliation breaks for the authenticated business. Admin only." }, async () => {
    if (scope.role !== "ADMIN") return result({ error: "ADMIN role required" });
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Supabase reconciliation storage is not configured");
    const { data, error } = await createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } }).from("reconciliation_breaks").select("id,break_type,provider_reference,expected_amount_cents,actual_amount_cents,status,created_at").eq("business_id", scope.businessId).order("created_at", { ascending: false });
    if (error) throw error;
    return result({ businessId: scope.businessId, breaks: (data ?? []).map((row) => ({ ...row, ageBucket: ageBucket(row.created_at) })) });
  });

  return server;
}

export const mcpHandler = createMcpHandler(makeServer, { legacy: "stateless" });
