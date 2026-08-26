# Member Access and Request History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restrict members to personal card and payment-request data while preserving payment initiation and a read-only request history.

**Architecture:** A pure domain policy defines route and navigation capabilities. Server pages and route handlers resolve the authenticated scope and enforce that policy close to each protected read or mutation; role-aware shared pages receive minimal DTOs. `/approvals` keeps the admin queue and renders a member-only request history filtered by authenticated business and member IDs.

**Tech Stack:** Next.js 16.3 App Router, React 19, TypeScript 5.7, Supabase, Vitest

**Spec:** `docs/superpowers/specs/2026-08-26-member-access-and-request-history-design.md`

## Global Constraints

- Keep the existing two-role `ADMIN`/`MEMBER` model; do not add configurable RBAC.
- UI hiding is never the authorization boundary.
- Every service-role query must apply authenticated business scope and any required member/resource filter.
- Members may create payments but may not approve or reject them.
- Member request DTOs must exclude beneficiary bank details and other member identifiers.
- Use server page entry points for secure redirects and client components only for interactive UI.

---

### Task 1: Central access policy

**Files:**
- Create: `src/domain/access-policy.ts`
- Create: `src/domain/access-policy.test.ts`

**Interfaces:**
- Consumes: `MembershipRole` from `src/domain/auth.ts`.
- Produces: `canAccessPage(role, pathname)`, `navigationForRole(role)`, `canViewBusinessFinancials(role)`, and `canManageBusiness(role)`.

- [ ] **Step 1: Write the failing policy tests**

```ts
expect(canAccessPage("MEMBER", "/payments")).toBe(true);
expect(canAccessPage("MEMBER", "/funding")).toBe(false);
expect(canAccessPage("ADMIN", "/reconciliation")).toBe(true);
expect(navigationForRole("MEMBER").map((item) => item.label)).toEqual(["Overview", "Cards", "Send money", "My requests"]);
```

- [ ] **Step 2: Run the focused test and verify missing-module failure**

Run: `npm test -- src/domain/access-policy.test.ts`

Expected: FAIL because `access-policy.ts` does not exist.

- [ ] **Step 3: Implement the pure policy**

```ts
const ADMIN_ONLY_PREFIXES = ["/team", "/funding", "/statements", "/reconciliation"] as const;

export function canAccessPage(role: MembershipRole, pathname: string) {
  return role === "ADMIN" || !ADMIN_ONLY_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
```

Define immutable admin/member navigation arrays. Use `/approvals` with label `Approvals` for admins and `My requests` for members.

- [ ] **Step 4: Run the focused test**

Run: `npm test -- src/domain/access-policy.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the policy**

```bash
git add src/domain/access-policy.ts src/domain/access-policy.test.ts
git commit -m "feat: define member access policy"
```

### Task 2: Role-aware navigation

**Files:**
- Modify: `app/api/navigation-status/route.ts`
- Modify: `app/components/AppNav.tsx`
- Test: `src/domain/access-policy.test.ts`

**Interfaces:**
- Consumes: `navigationForRole(role)` from Task 1 and authenticated `scope.role`.
- Produces: navigation-status JSON containing `role`; member navigation without admin-only links.

- [ ] **Step 1: Extend the policy test for hrefs and role-specific labels**

```ts
expect(navigationForRole("MEMBER")).toEqual([
  { href: "/", label: "Overview" },
  { href: "/cards", label: "Cards" },
  { href: "/payments", label: "Send money" },
  { href: "/approvals", label: "My requests" },
]);
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `npm test -- src/domain/access-policy.test.ts`

Expected: FAIL until the exact DTO is returned.

- [ ] **Step 3: Return role and render policy navigation**

Add `role: scope.role` to `/api/navigation-status` and return `ownerName` only for admins so a member is not labelled with the business owner's identity. In `AppNav`, store the returned role and map `navigationForRole(role)`; keep icons selected by href and preserve active-card behavior. Clear role on sign-out and fall back to the authenticated email for a member's avatar and name.

- [ ] **Step 4: Run policy tests and type-check**

Run: `npm test -- src/domain/access-policy.test.ts && npm run typecheck`

Expected: PASS.

- [ ] **Step 5: Commit navigation**

```bash
git add app/api/navigation-status/route.ts app/components/AppNav.tsx src/domain/access-policy.test.ts
git commit -m "feat: tailor navigation to membership role"
```

### Task 3: Page and API administration guards

**Files:**
- Create: `src/lib/page-authorization.ts`
- Modify: `app/team/page.tsx`
- Modify: `app/funding/page.tsx`
- Modify: `app/statements/page.tsx`
- Create: `app/reconciliation/ReconciliationClient.tsx`
- Modify: `app/reconciliation/page.tsx`
- Modify: `app/api/employees/route.ts`
- Modify: `app/api/funding/route.ts`
- Modify: `app/api/funding/link-token/route.ts`
- Modify: `app/api/funding/exchange/route.ts`
- Modify: `app/api/funding/[id]/route.ts`
- Modify: `app/api/funding/[id]/simulate/route.ts`
- Modify: `app/api/agent/reconciliation-breaks/route.ts`
- Modify: `app/api/account/route.ts`
- Test: `src/domain/access-policy.test.ts`

**Interfaces:**
- Consumes: `canAccessPage` and `AuthenticatedScope`.
- Produces: `requirePageAccess(scope, pathname): void`, redirecting unauthorized members to `/`.

- [ ] **Step 1: Add failing tests for exact and nested admin-only routes**

```ts
expect(canAccessPage("MEMBER", "/statements/card/tx-1")).toBe(false);
expect(canAccessPage("MEMBER", "/reconciliation/break-1")).toBe(false);
```

- [ ] **Step 2: Run focused tests and verify failure if nested matching is incomplete**

Run: `npm test -- src/domain/access-policy.test.ts`

Expected: FAIL for any missing nested prefix coverage.

- [ ] **Step 3: Add the server page guard and protect pages before reads**

```ts
export function requirePageAccess(scope: AuthenticatedScope, pathname: string) {
  if (!canAccessPage(scope.role, pathname)) redirect("/");
}
```

Make team, funding, and statements server pages call the guard immediately after `getAuthenticatedScope()`. Move the current reconciliation client implementation unchanged into `ReconciliationClient.tsx`; make `page.tsx` a server wrapper that authenticates, guards, then renders it.

- [ ] **Step 4: Add missing API admin checks**

Immediately after authentication, return `NextResponse.json({ error: "ADMIN role required" }, { status: 403 })` for member access to employee listing, every funding route, the business-wide account endpoint, and reconciliation-break listing. Keep existing reconciliation mutation checks.

- [ ] **Step 5: Run focused and complete authorization tests**

Run: `npm test -- src/domain/access-policy.test.ts src/auth/authorization.test.ts src/lib/auth-scope.test.ts && npm run typecheck`

Expected: PASS.

- [ ] **Step 6: Commit guards**

```bash
git add src/lib/page-authorization.ts app/team app/funding/page.tsx app/statements/page.tsx app/reconciliation app/api/employees/route.ts app/api/funding app/api/account/route.ts app/api/agent/reconciliation-breaks/route.ts
git commit -m "feat: enforce admin-only business surfaces"
```

### Task 4: Scoped member payment reads

**Files:**
- Modify: `src/repositories/supabase-payment-repository.ts`
- Create: `src/repositories/supabase-payment-repository.test.ts`
- Modify: `app/api/approvals/route.ts`
- Modify: `app/api/payments/[id]/route.ts`
- Create: `src/domain/payment-request-view.ts`
- Create: `src/domain/payment-request-view.test.ts`

**Interfaces:**
- Produces: `PaymentRequestView` with `id`, `recipient`, `amountCents`, `status`, `createdAt`; `paymentStatusLabel(status)`; repository `listForMember(businessId, memberId)`.
- Consumes: authenticated scope and `PaymentStatus`.

- [ ] **Step 1: Write failing status-label tests**

```ts
expect(paymentStatusLabel("PENDING_APPROVAL")).toBe("Pending approval");
expect(paymentStatusLabel("SETTLED")).toBe("Settled");
expect(paymentStatusLabel("RETURNED")).toBe("Returned");
```

- [ ] **Step 2: Run the focused test and verify missing-module failure**

Run: `npm test -- src/domain/payment-request-view.test.ts`

Expected: FAIL because the view module does not exist.

- [ ] **Step 3: Implement the DTO, labels, and repository query**

The member query must select only `id,amount_cents,recipient,status,created_at`, apply `.eq("business_id", businessId).eq("initiator_member_id", memberId)`, and order `created_at` descending. Add a repository test with a mocked Supabase query builder that records both `.eq` calls and asserts the query includes `business_id = business-a` and `initiator_member_id = member-a`; also assert the returned DTO has no bank-account or initiator-member fields.

- [ ] **Step 4: Make `/api/approvals` role-aware**

Admins receive `{ mode: "approval-queue", approvals }` from `listPending`. Members receive `{ mode: "request-history", requests }` from `listForMember`. Do not accept a member ID from query parameters.

- [ ] **Step 5: Protect single-payment polling**

After loading a business-scoped payment in `app/api/payments/[id]/route.ts`, return `404` when a member is not its initiator. Admins retain business-wide reads.

- [ ] **Step 6: Run tests and type-check**

Run: `npm test -- src/domain/payment-request-view.test.ts src/repositories/supabase-payment-repository.test.ts src/domain/payment-lifecycle.test.ts && npm run typecheck`

Expected: PASS.

- [ ] **Step 7: Commit scoped reads**

```bash
git add src/domain/payment-request-view.ts src/domain/payment-request-view.test.ts src/repositories/supabase-payment-repository.ts src/repositories/supabase-payment-repository.test.ts app/api/approvals/route.ts app/api/payments/[id]/route.ts
git commit -m "feat: scope member payment request history"
```

### Task 5: Role-aware approvals and request-history UI

**Files:**
- Create: `app/approvals/ApprovalsClient.tsx`
- Modify: `app/approvals/page.tsx`
- Create: `app/approvals/request-view.ts`
- Create: `app/approvals/request-view.test.ts`

**Interfaces:**
- Consumes: page prop `role: MembershipRole` and role-aware API response from Task 4.
- Produces: admin approval queue or member read-only request history.

- [ ] **Step 1: Write failing view-model tests**

```ts
expect(approvalPageCopy("MEMBER")).toEqual({ title: "My requests", description: "Track payments you have sent for approval." });
expect(approvalPageCopy("ADMIN").title).toBe("Approvals");
expect(statusTone("REJECTED")).toBe("chip-red");
```

- [ ] **Step 2: Run the focused test and verify missing-module failure**

Run: `npm test -- app/approvals/request-view.test.ts`

Expected: FAIL because `request-view.ts` does not exist.

- [ ] **Step 3: Split the server wrapper from interactive content**

`page.tsx` resolves scope and renders `<ApprovalsClient role={scope.role} />`. Move current hooks/actions to the client component. Render approve/reject buttons only for admins; render recipient, creation date, amount, and labelled status for member requests. Use **No requests yet** for an empty member result.

- [ ] **Step 4: Run focused tests and type-check**

Run: `npm test -- app/approvals/request-view.test.ts src/domain/payment-request-view.test.ts && npm run typecheck`

Expected: PASS.

- [ ] **Step 5: Commit the shared page**

```bash
git add app/approvals
git commit -m "feat: show members their payment request history"
```

### Task 6: Personal member overview and account

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/account/page.tsx`

**Interfaces:**
- Consumes: authenticated scope, filtered card assignments, Lithic cards, and `listForMember`.
- Produces: member pages with personal data only; unchanged admin business pages.

- [ ] **Step 1: Add role branches before business-wide reads**

In `app/page.tsx`, branch immediately after authentication. The member branch fetches card assignments filtered with `filterVisibleCards`, matching provider cards, and recent member requests; it never calls ledger balance/activity methods. Render links to `/cards`, `/payments`, and `/approvals`.

- [ ] **Step 2: Restrict member account content**

In `app/account/page.tsx`, render the member's email, role label, and sign-out action without fetching or rendering onboarding or funding records. Keep the existing admin account view.

- [ ] **Step 3: Run type-check and all focused tests**

Run: `npm run typecheck && npm test -- src/domain/access-policy.test.ts src/domain/card-access.test.ts src/domain/payment-request-view.test.ts src/repositories/supabase-payment-repository.test.ts app/approvals/request-view.test.ts`

Expected: PASS.

- [ ] **Step 4: Commit personal surfaces**

```bash
git add app/page.tsx app/account/page.tsx
git commit -m "feat: add personal member workspace"
```

### Task 7: Full verification

**Files:**
- Modify only files required to fix failures introduced by Tasks 1–6.

**Interfaces:**
- Consumes all prior tasks.
- Produces a verified member-access implementation.

- [ ] **Step 1: Run the full automated suite**

Run: `npm test`

Expected: all Vitest tests pass.

- [ ] **Step 2: Run static verification**

Run: `npm run typecheck && npm run lint`

Expected: both commands exit successfully.

- [ ] **Step 3: Run the production build**

Run: `npm run build`

Expected: Next.js production build completes successfully.

- [ ] **Step 4: Audit authorization call sites**

Run: `rg -n "getAuthenticatedScope|createClient\(|createSupabaseAdminClient" app/api app --glob '!**/*.test.*'`

Confirm admin-only routes reject `MEMBER`, shared resource reads enforce ownership, and no member UI branch performs business-wide reads.

- [ ] **Step 5: Commit verification-only corrections if the earlier checks required changes**

Stage only the specific files changed to correct a failing check, inspect `git diff --cached`, then commit them with `git commit -m "fix: close member authorization gaps"`. If no correction was necessary, do not create an empty commit.
