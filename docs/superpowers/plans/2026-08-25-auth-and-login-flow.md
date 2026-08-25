# Minimal Auth and Login Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the least-friction Supabase email/password login flow and use the logged-in user's business membership instead of a hardcoded demo scope.

**Architecture:** Supabase Auth owns credentials and cookie sessions. A small `business_memberships` table maps an Auth user to one business/account and a demo role. Server pages and API routes resolve the authenticated user, then use the membership scope; the existing service-role repositories remain provider-agnostic and unchanged.

**Tech Stack:** Next.js App Router, Supabase Auth, `@supabase/ssr`, Supabase Postgres, TypeScript, Vitest.

**Spec:** `docs/p1-plan.md` and Track 3 submission requirement for demo credentials for two roles.

## Global Constraints

- Keep the flow demo-sized: email/password, login, logout, session refresh, two seeded roles.
- Do not expose `SUPABASE_SERVICE_ROLE_KEY` or secret keys to browser code.
- Do not use editable user metadata for authorization; roles come from `business_memberships`.
- Keep the existing Persona approval gate and Plaid flow intact.
- Do not add password reset, invitations, MFA, social login, or account administration in this slice.

---

### Task 1: Add the auth and membership schema

**Files:**
- Create: `supabase/migrations/20260825190000_auth_and_business_memberships.sql`
- Test/verify: Supabase SQL verification query

- [ ] Create `business_memberships` with `user_id`, `business_id`, `account_id`, `role`, timestamps, a unique user/business constraint, RLS, and authenticated read policy limited to the current user.
- [ ] Verify the table and policy exist remotely.

### Task 2: Add cookie-based Supabase clients and session refresh

**Files:**
- Create: `src/lib/supabase/browser.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/proxy.ts`
- Create: `proxy.ts`
- Modify: `package.json`, `package-lock.json`

- [ ] Install the pinned `@supabase/ssr` package.
- [ ] Add browser/server clients using `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- [ ] Add a proxy that refreshes sessions and redirects unauthenticated users to `/login`, excluding auth routes and static assets.

### Task 3: Add the auth domain and membership scope resolver

**Files:**
- Create: `src/domain/auth.ts`
- Create: `src/domain/auth.test.ts`
- Create: `src/lib/auth-scope.ts`

- [ ] Write failing tests for role validation and a missing-membership error.
- [ ] Resolve the current user with `getClaims()` and look up the membership using the service-role client.
- [ ] Return `{ userId, businessId, accountId, role }` and remove request-path dependence on `demoScope()` where authenticated user scope is required.

### Task 4: Build the login/logout flow

**Files:**
- Create: `app/login/page.tsx`
- Create: `app/login/LoginForm.tsx`
- Create: `app/auth/signout/route.ts`
- Modify: `app/components/AppNav.tsx`

- [ ] Write the login form with email/password and a clear error state.
- [ ] Sign in through the browser Supabase client; redirect to `/` on success.
- [ ] Add logout and show the signed-in email/role in navigation.

### Task 5: Replace hardcoded application scope

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/onboarding/page.tsx`
- Modify: `app/api/onboarding/persona/route.ts`
- Modify: `app/funding/page.tsx`
- Modify: `app/api/funding/link-token/route.ts`
- Modify: `app/api/funding/exchange/route.ts`
- Modify: `app/api/cards/route.ts`

- [ ] Use the authenticated membership scope in pages and transactional routes.
- [ ] Return `401` for unauthenticated API calls and `403` for users without a membership.
- [ ] Preserve the existing approval and ledger behavior for the demo business.

### Task 6: Seed the two demo roles and verify the flow

**Files:**
- Create: `scripts/seed-demo-auth.mjs`
- Modify: `.env.example`, `docs/p1-plan.md`, `decisions.md`

- [ ] Add an idempotent server-only seed script that creates or finds two Auth users and inserts memberships for `ADMIN` and `MEMBER`.
- [ ] Run it against the configured Supabase project without printing secrets.
- [ ] Verify login, logout, refresh, onboarding visibility, and role display locally.
- [ ] Run tests, typecheck, build, and deploy.

## Verification

- `npm test`
- `npm run typecheck`
- `npm run build`
- Log in as both demo users and confirm both see the same business scope while retaining distinct roles.
- Confirm unauthenticated access redirects to `/login` and no service-role key appears in browser bundles.
