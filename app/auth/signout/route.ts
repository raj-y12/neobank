import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/src/lib/supabase/server";

export async function POST(request: Request) {
  await (await createServerSupabaseClient()).auth.signOut();
  return NextResponse.redirect(new URL("/login", request.url), 303);
}
