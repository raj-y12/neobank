import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthenticatedScope } from "@/src/lib/auth-scope";
import { processPaymentRailEvent } from "@/app/api/webhooks/payment-rail/route";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const scope = await getAuthenticatedScope();
    const { id } = await params;
    const body = await request.json() as { action?: "SETTLE" | "RETURN" };
    if (body.action !== "SETTLE" && body.action !== "RETURN") return NextResponse.json({ error: "action must be SETTLE or RETURN" }, { status: 400 });
    const client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: funding, error } = await client.from("funding_transfers").select("provider_transfer_id,status").eq("id", id).eq("business_id", scope.businessId).eq("account_id", scope.accountId).maybeSingle<{ provider_transfer_id: string; status: string }>();
    if (error) throw error;
    if (!funding) return NextResponse.json({ error: "Funding transfer not found" }, { status: 404 });
    if (funding.status !== "PENDING") return NextResponse.json({ error: `Funding transfer is already ${funding.status}` }, { status: 409 });
    if (process.env.PAYMENT_RAIL_MODE !== "LIVE") {
      const result = await processPaymentRailEvent({ providerEventId: `sim-funding-${id}-${body.action.toLowerCase()}`, fundingTransferId: id, status: body.action === "SETTLE" ? "SETTLED" : "RETURNED", occurredAt: new Date().toISOString() });
      return NextResponse.json({ ...result, providerStatus: body.action === "SETTLE" ? "SETTLED" : "RETURNED", mode: "SIMULATED" }, { status: 202 });
    }
    const { IncreaseAchRail } = await import("@/src/integrations/increase/client");
    const rail = new IncreaseAchRail();
    const result = body.action === "SETTLE"
      ? await rail.simulateSettlement(funding.provider_transfer_id)
      : await rail.simulateReturn(funding.provider_transfer_id);
    return NextResponse.json({ accepted: true, providerStatus: result.status, mode: "LIVE" }, { status: 202 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to simulate funding lifecycle" }, { status: 400 });
  }
}
