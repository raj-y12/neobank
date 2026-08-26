import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getPaymentRail } from "@/src/integrations/simulated-ach";
import { APPROVAL_THRESHOLD_CENTS } from "@/src/domain/payment-lifecycle";

function advance(date: string, frequency: "DAILY" | "WEEKLY" | "MONTHLY") {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + (frequency === "DAILY" ? 1 : frequency === "WEEKLY" ? 7 : 0));
  if (frequency === "MONTHLY") next.setUTCMonth(next.getUTCMonth() + 1);
  return next.toISOString().slice(0, 10);
}

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });
  const today = new Date().toISOString().slice(0, 10);
  const { data: orders, error } = await client.from("standing_orders").select("id,business_id,account_id,amount_cents,recipient,insufficient_funds_policy,next_run_date,frequency").eq("status", "ACTIVE").lte("next_run_date", today);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const results: Array<{ id: string; status: string }> = [];
  for (const order of orders ?? []) {
    const { data: occurrence, error: claimError } = await client.rpc("claim_standing_order_occurrence", { p_standing_order_id: order.id, p_scheduled_date: order.next_run_date });
    if (claimError) throw claimError;
    if (occurrence.status !== "PENDING") { results.push({ id: order.id, status: "ALREADY_PROCESSED" }); continue; }
    const { data: member } = await client.from("business_members").select("id").eq("business_id", order.business_id).eq("role", "ADMIN").limit(1).single();
    if (!member) throw new Error(`No admin member for standing order ${order.id}`);
    const paymentId = crypto.randomUUID();
    const idempotencyKey = `standing-order:${order.id}:${order.next_run_date}`;
    const { error: paymentError } = await client.from("payments").insert({ id: paymentId, business_id: order.business_id, account_id: order.account_id, initiator_member_id: member.id, provider: "ACH", amount_cents: order.amount_cents, currency: "USD", rail: "ACH", recipient: order.recipient, status: "APPROVED", idempotency_key: idempotencyKey });
    if (paymentError && paymentError.code !== "23505") throw paymentError;
    if (paymentError?.code === "23505") { results.push({ id: order.id, status: "ALREADY_PROCESSED" }); continue; }
    if (order.amount_cents > APPROVAL_THRESHOLD_CENTS) {
      await client.from("standing_order_occurrences").update({ status: "PENDING_APPROVAL", payment_id: paymentId, updated_at: new Date().toISOString() }).eq("id", occurrence.id);
      await client.from("standing_orders").update({ next_run_date: advance(order.next_run_date, order.frequency), updated_at: new Date().toISOString() }).eq("id", order.id);
      results.push({ id: order.id, status: "PENDING_APPROVAL" });
      continue;
    }
    const { error: reserveError } = await client.rpc("reserve_payment_funds", { p_business_id: order.business_id, p_account_id: order.account_id, p_payment_id: paymentId, p_amount_cents: order.amount_cents });
    if (reserveError) {
      await client.from("standing_order_occurrences").update({ status: "INSUFFICIENT_FUNDS", updated_at: new Date().toISOString() }).eq("id", occurrence.id);
      await client.from("payments").update({ status: "REJECTED", updated_at: new Date().toISOString() }).eq("id", paymentId);
      await client.from("standing_orders").update({ next_run_date: order.insufficient_funds_policy === "RETRY_NEXT_DAY" ? today : advance(order.next_run_date, order.frequency), updated_at: new Date().toISOString() }).eq("id", order.id);
      results.push({ id: order.id, status: "INSUFFICIENT_FUNDS" });
      continue;
    }
    const rail = getPaymentRail();
    let providerAccountId: string | undefined;
    if (rail.mode === "LIVE") {
      const { data: providerAccount, error: providerAccountError } = await client.from("provider_accounts").select("provider_account_id").eq("business_id", order.business_id).eq("account_id", order.account_id).eq("provider", "INCREASE").eq("status", "ACTIVE").maybeSingle<{ provider_account_id: string }>();
      if (providerAccountError) throw providerAccountError;
      if (!providerAccount) throw new Error(`No active Increase provider account for standing order ${order.id}`);
      providerAccountId = providerAccount.provider_account_id;
    }
    const transfer = await rail.createOutbound({ amountCents: order.amount_cents, recipient: typeof order.recipient === "string" ? order.recipient : order.recipient.name ?? "Standing order", providerAccountId, idempotencyKey: `payment-submit:${paymentId}` });
    await client.from("payments").update({ provider_payment_id: transfer.providerTransferId, status: "SUBMITTED", updated_at: new Date().toISOString() }).eq("id", paymentId);
    await client.from("standing_order_occurrences").update({ status: "SUBMITTED", payment_id: paymentId, updated_at: new Date().toISOString() }).eq("id", occurrence.id);
    await client.from("standing_orders").update({ next_run_date: advance(order.next_run_date, order.frequency), updated_at: new Date().toISOString() }).eq("id", order.id);
    results.push({ id: order.id, status: "SUBMITTED" });
  }
  return NextResponse.json({ processed: results.length, results });
}
