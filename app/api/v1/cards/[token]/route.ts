import { getBusinessCardAssignment } from "@/src/repositories/supabase-business-card-repository";
import { getPublicApiScope, publicApiError } from "@/src/lib/public-api-auth";

export async function GET(request: Request, context: { params: Promise<{ token: string }> }) {
  try {
    const scope = await getPublicApiScope(request);
    const { token } = await context.params;
    const card = await getBusinessCardAssignment(scope.businessId, token);
    if (!card || (scope.role === "MEMBER" && card.memberId !== scope.memberId)) return Response.json({ error: "Card not found", code: "not_found" }, { status: 404 });
    return Response.json({ card });
  } catch (error) { return publicApiError(error, "Unable to load card"); }
}
