import { mcpHandler } from "@/src/mcp/server";

export async function POST(request: Request) {
  return mcpHandler.fetch(request);
}

export async function GET(request: Request) {
  return mcpHandler.fetch(request);
}

export async function DELETE(request: Request) {
  return mcpHandler.fetch(request);
}
