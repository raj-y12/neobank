import { publicApiOpenApi } from "@/src/lib/public-api-openapi";

export function GET() {
  return Response.json(publicApiOpenApi);
}
