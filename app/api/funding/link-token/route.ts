import { NextResponse } from "next/server";
import { contextFromHeaders } from "@/src/auth/authorization";
import { createPlaidLinkToken } from "@/src/integrations/plaid/client";

export async function POST(request: Request) {
  try {
    const context = contextFromHeaders(request.headers);
    return NextResponse.json(await createPlaidLinkToken(context.businessId));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create link token" }, { status: 400 });
  }
}
