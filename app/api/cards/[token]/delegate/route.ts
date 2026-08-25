import { NextResponse } from "next/server";
import { getAuthenticatedScope } from "@/src/lib/auth-scope";
import { delegateBusinessCard } from "@/src/repositories/supabase-business-card-repository";

export async function PATCH(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const scope = await getAuthenticatedScope();
    if (scope.role !== "ADMIN") return NextResponse.json({ error: "ADMIN role required" }, { status: 403 });
    const { token } = await params;
    const body = await request.json() as { memberId?: string };
    if (!body.memberId) return NextResponse.json({ error: "memberId is required" }, { status: 400 });
    const card = await delegateBusinessCard({ businessId: scope.businessId, cardToken: token, memberId: body.memberId });
    return NextResponse.json({ card });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to delegate card" }, { status: 400 });
  }
}
