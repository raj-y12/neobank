import { NextResponse } from "next/server";
import { listLithicCards } from "@/src/integrations/lithic/client";
import { getAuthenticatedScope } from "@/src/lib/auth-scope";
import { syncBusinessCards } from "@/src/repositories/supabase-business-card-repository";

export async function POST() {
  try {
    const scope = await getAuthenticatedScope();
    if (scope.role !== "ADMIN") throw new Error("ADMIN role required");
    const cards = await listLithicCards();
    const created = await syncBusinessCards({ businessId: scope.businessId, cardTokens: cards.map((card) => card.token) });
    return NextResponse.json({ created, total: cards.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to sync cards";
    const status = message.includes("Admin role required") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
