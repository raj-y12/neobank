import { mcpHandler } from "@/src/mcp/server";
import { getPublicApiScope } from "@/src/lib/public-api-auth";

async function handle(request: Request) {
  try {
    await getPublicApiScope(request);
  } catch {
    return Response.json({ jsonrpc: "2.0", error: { code: -32001, message: "Authentication required" }, id: null }, { status: 401, headers: { "WWW-Authenticate": "Bearer" } });
  }
  return mcpHandler.fetch(request);
}

export async function POST(request: Request) {
  return handle(request);
}

export async function GET(request: Request) {
  return handle(request);
}

export async function DELETE(request: Request) {
  return handle(request);
}
