import { NextResponse } from "next/server";
import { createLithicVirtualCard } from "@/src/integrations/lithic/client";

export async function POST() {
  try {
    const card = await createLithicVirtualCard();
    return NextResponse.json({ card }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to issue card";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
