import { NextResponse } from "next/server";
import { getAuthenticatedScope } from "@/src/lib/auth-scope";
import { createSupabaseLedgerRepository } from "@/src/repositories/supabase-ledger-repository";

export async function GET() {
  try {
    const context = await getAuthenticatedScope();
    if (context.role !== "ADMIN") return NextResponse.json({ error: "ADMIN role required" }, { status: 403 });
    const balances = await createSupabaseLedgerRepository().getBalances({ businessId: context.businessId, accountId: context.accountId });
    return NextResponse.json({ businessId: context.businessId, accountId: context.accountId, currency: "USD", source: "ledger", ...balances });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 });
  }
}
