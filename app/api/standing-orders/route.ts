import { NextResponse } from "next/server";
import { getAuthenticatedScope } from "@/src/lib/auth-scope";
import { createClient } from "@supabase/supabase-js";
import { maskAchAccountNumber, validateAchBankDetails } from "@/src/domain/ach";
import { encryptSensitiveValue } from "@/src/integrations/plaid/client";
import { isIsoCalendarDate } from "@/src/domain/standing-orders";

function adminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase standing-order storage is not configured");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function publicRecipient(recipient: unknown) {
  if (typeof recipient === "string") return { name: recipient, accountMask: null };
  const value = recipient && typeof recipient === "object" ? recipient as { name?: unknown; accountMask?: unknown } : {};
  return { name: typeof value.name === "string" ? value.name : "Unknown recipient", accountMask: typeof value.accountMask === "string" ? value.accountMask : null };
}

export async function GET() {
  try {
    const scope = await getAuthenticatedScope();
    if (scope.role !== "ADMIN") return NextResponse.json({ error: "ADMIN role required" }, { status: 403 });
    const client = adminClient();
    const { data: orders, error: orderError } = await client.from("standing_orders").select("*").eq("business_id", scope.businessId).order("created_at", { ascending: false });
    if (orderError) throw orderError;
    const orderRows = orders ?? [];
    const orderIds = orderRows.map((order) => order.id as string);
    if (!orderIds.length) return NextResponse.json({ standingOrders: [] });
    const { data: occurrences, error: occurrenceError } = await client.from("standing_order_occurrences").select("id,standing_order_id,occurrence_key,scheduled_date,status,payment_id,created_at,updated_at").in("standing_order_id", orderIds).order("scheduled_date", { ascending: false });
    if (occurrenceError) throw occurrenceError;
    const paymentIds = (occurrences ?? []).flatMap((occurrence) => occurrence.payment_id ? [occurrence.payment_id as string] : []);
    const { data: payments, error: paymentError } = paymentIds.length
      ? await client.from("payments").select("id,status,provider_payment_id,amount_cents,created_at").eq("business_id", scope.businessId).in("id", paymentIds)
      : { data: [], error: null };
    if (paymentError) throw paymentError;
    const paymentById = new Map((payments ?? []).map((payment) => [payment.id, payment]));
    const occurrencesByOrder = new Map<string, unknown[]>();
    for (const occurrence of occurrences ?? []) {
      const items = occurrencesByOrder.get(occurrence.standing_order_id) ?? [];
      items.push({ ...occurrence, payment: occurrence.payment_id ? paymentById.get(occurrence.payment_id) ?? null : null });
      occurrencesByOrder.set(occurrence.standing_order_id, items);
    }
    return NextResponse.json({ standingOrders: orderRows.map((order) => ({ ...order, recipient: publicRecipient(order.recipient), occurrences: occurrencesByOrder.get(order.id) ?? [] })) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to list standing orders" }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const scope = await getAuthenticatedScope();
    if (scope.role !== "ADMIN") return NextResponse.json({ error: "ADMIN role required" }, { status: 403 });
    const body = await request.json() as { amountCents?: number; recipient?: string; accountNumber?: string; routingNumber?: string; frequency?: string; nextRunDate?: string; insufficientFundsPolicy?: string };
    if (!Number.isSafeInteger(body.amountCents) || (body.amountCents ?? 0) <= 0 || !body.recipient?.trim() || !body.accountNumber || !body.routingNumber || !body.nextRunDate) throw new Error("amountCents, recipient, accountNumber, routingNumber, and nextRunDate are required");
    if (!isIsoCalendarDate(body.nextRunDate)) throw new Error("nextRunDate must be an ISO date");
    validateAchBankDetails(body.accountNumber, body.routingNumber);
    if (!/^(DAILY|WEEKLY|MONTHLY)$/.test(body.frequency ?? "")) throw new Error("frequency must be DAILY, WEEKLY, or MONTHLY");
    if (!/^(SKIP|RETRY_NEXT_DAY)$/.test(body.insufficientFundsPolicy ?? "SKIP")) throw new Error("Invalid insufficient-funds policy");
    const { data, error } = await adminClient().from("standing_orders").insert({ business_id: scope.businessId, account_id: scope.accountId, amount_cents: body.amountCents, recipient: { name: body.recipient.trim(), accountMask: maskAchAccountNumber(body.accountNumber), encryptedAccountNumber: encryptSensitiveValue(body.accountNumber), encryptedRoutingNumber: encryptSensitiveValue(body.routingNumber) }, frequency: body.frequency, next_run_date: body.nextRunDate, insufficient_funds_policy: body.insufficientFundsPolicy ?? "SKIP" }).select("*").single();
    if (error) throw error;
    return NextResponse.json({ standingOrder: { ...data, recipient: publicRecipient(data.recipient) } }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create standing order" }, { status: 400 });
  }
}
