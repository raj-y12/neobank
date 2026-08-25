import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { getRequiredRoute } from "@/src/domain/navigation-gate";

export async function updateSupabaseSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return response;
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data } = await supabase.auth.getClaims();
  const pathname = request.nextUrl.pathname;
  const isPublic = pathname === "/login" || pathname === "/api/auth/signup" || pathname.startsWith("/auth") || pathname.startsWith("/api/webhooks/") || pathname.startsWith("/_next") || pathname.includes(".");
  if (!data?.claims && !isPublic) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }
  if (data?.claims && !isPublic && !pathname.startsWith("/api/")) {
    const userId = typeof data.claims.sub === "string" ? data.claims.sub : null;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (userId && serviceRoleKey) {
      const admin = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
      const { data: membership } = await admin.from("business_memberships").select("business_id").eq("user_id", userId).maybeSingle<{ business_id: string }>();
      if (membership) {
        const [{ data: onboarding }, { data: funding }] = await Promise.all([
          admin.from("business_onboarding").select("business_status,owner_status").eq("business_id", membership.business_id).maybeSingle<{ business_status: string; owner_status: string }>(),
          admin.from("linked_funding_accounts").select("id").eq("business_id", membership.business_id).maybeSingle<{ id: string }>(),
        ]);
        const requiredRoute = getRequiredRoute({
          onboardingApproved: onboarding?.business_status === "APPROVED" && onboarding.owner_status === "APPROVED",
          fundingLinked: Boolean(funding),
          pathname,
        });
        if (requiredRoute) {
          const redirect = request.nextUrl.clone();
          redirect.pathname = requiredRoute;
          redirect.search = "";
          return NextResponse.redirect(redirect);
        }
      }
    }
  }
  return response;
}
