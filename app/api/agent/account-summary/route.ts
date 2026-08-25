import { NextResponse } from "next/server";
import { contextFromHeaders } from "@/src/auth/authorization";
import { createSupabaseLedgerRepository } from "@/src/repositories/supabase-ledger-repository";

export async function GET(request: Request) {
  try {
    const context = contextFromHeaders(request.headers);
    const balances = await createSupabaseLedgerRepository().getBalances({ businessId: context.businessId, accountId: context.accountId });
    return NextResponse.json({ businessId: context.businessId, accountId: context.accountId, currency: "USD", source: "ledger", ...balances });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 });
  }
}
