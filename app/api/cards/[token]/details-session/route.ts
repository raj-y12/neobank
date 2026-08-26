import { NextResponse } from "next/server";
import { canViewCard } from "@/src/domain/card-access";
import { createLithicCardEmbedSession } from "@/src/integrations/lithic/client";
import { getAuthenticatedScope } from "@/src/lib/auth-scope";
import { getBusinessCardAssignment } from "@/src/repositories/supabase-business-card-repository";

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  try {
    const scope = await getAuthenticatedScope();
    const { token } = await context.params;
    const assignment = await getBusinessCardAssignment(scope.businessId, token);
    if (!assignment || !canViewCard({ role: scope.role, currentMemberId: scope.memberId, assignedMemberId: assignment.memberId })) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }
    const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL;
    const targetOrigin = configuredOrigin ? new URL(configuredOrigin).origin : new URL(request.url).origin;
    const session = await createLithicCardEmbedSession({ cardToken: token, targetOrigin });
    return NextResponse.json({ session, expiresInSeconds: 600 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to reveal card details" }, { status: 400 });
  }
}
