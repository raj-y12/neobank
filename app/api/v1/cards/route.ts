import { listBusinessCardAssignments } from "@/src/repositories/supabase-business-card-repository";
import { getPublicApiScope, publicApiError } from "@/src/lib/public-api-auth";

export async function GET(request: Request) {
  try {
    const scope = await getPublicApiScope(request);
    const assignments = await listBusinessCardAssignments(scope.businessId);
    const cards = scope.role === "MEMBER" ? assignments.filter((card) => card.memberId === scope.memberId) : assignments;
    return Response.json({ cards });
  } catch (error) { return publicApiError(error, "Unable to load cards"); }
}
