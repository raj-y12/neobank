# Standing Orders End-to-End Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make standing orders a complete, visible admin workflow from creation through scheduled execution, approval, retry/skip outcomes, and payment history.

**Architecture:** Reuse the existing `standing_orders` and `standing_order_occurrences` tables as the source of truth. Keep the existing `occurrence.payment_id` relationship as the canonical link to generated payments, expose a shaped admin API response, and add a client management page plus provenance indicators in approvals and payment status.

**Tech Stack:** Next.js 16 App Router route handlers, React 19 client components, Supabase service-role server repositories, TypeScript, Vitest, existing CSS system.

**Spec:** Track 3 neobank brief, standing-orders domain gauntlet and live-fire requirements.

## Global Constraints

- Standing orders are admin-only business operations.
- Generated payments above `$1,000.00` must start as `PENDING_APPROVAL`.
- Occurrence claiming remains idempotent across retries and restarts.
- Money remains integer USD cents.
- Ledger mutations remain append-only and are never replaced by UI state.
- Simulated and live payment rails retain their existing labels.

---

### Task 1: Centralize standing-order presentation and validation

**Files:**
- Modify: `src/domain/standing-orders.ts`
- Test: `src/domain/standing-orders.test.ts`

- [ ] Add pure helpers for status labels, frequency labels, occurrence status labels, and a safe recipient display name.
- [ ] Add tests covering every supported frequency and execution status.
- [ ] Run the focused domain test and confirm it passes.

### Task 2: Add shaped standing-order history API

**Files:**
- Modify: `app/api/standing-orders/route.ts`
- Modify: `app/api/standing-orders/[id]/route.ts`
- Test: `app/api/standing-orders/route.test.ts`

- [ ] Make `GET /api/standing-orders` return each order with its occurrences, linked payment ID/status, and execution metadata.
- [ ] Preserve business and admin authorization checks.
- [ ] Validate ISO dates and reject malformed updates.
- [ ] Add route tests for admin access, shaped history, and invalid date/status input.

### Task 3: Add admin navigation and page access

**Files:**
- Modify: `src/domain/access-policy.ts`
- Modify: `src/domain/navigation-gate.ts`
- Test: `src/domain/access-policy.test.ts`
- Test: `src/domain/navigation-gate.test.ts`

- [ ] Add `/standing-orders` to the admin-only navigation and access policy.
- [ ] Keep members out of the page and navigation.
- [ ] Add tests for admin visibility and member denial.

### Task 4: Build the standing-orders management page

**Files:**
- Create: `app/standing-orders/page.tsx`
- Create: `app/standing-orders/StandingOrdersClient.tsx`
- Modify: `app/globals.css`
- Test: `app/standing-orders/StandingOrdersClient.test.tsx`

- [ ] Add a create form for recipient, amount, frequency, next run date, and insufficient-funds policy.
- [ ] Render active, paused, canceled, and empty states.
- [ ] Add pause, resume, cancel, and next-run controls.
- [ ] Render occurrence history with statuses, payment IDs, and approval-required indicators.
- [ ] Provide loading, error, success, and disabled states.
- [ ] Test form labels, status indicators, and action requests.

### Task 5: Add provenance indicators to approvals and payment status

**Files:**
- Modify: `app/api/approvals/route.ts`
- Modify: `app/api/payments/[id]/route.ts`
- Modify: `app/approvals/ApprovalsClient.tsx`
- Modify: `app/payments/page.tsx`
- Test: relevant existing API/domain/UI tests

- [ ] Enrich approval and payment responses with standing-order metadata through `standing_order_occurrences.payment_id`.
- [ ] Display `Standing order` and `Approval required` indicators where applicable.
- [ ] Keep normal one-off payments unchanged.

### Task 6: Verify the complete flow and document it

**Files:**
- Modify: `README.md`
- Modify: `docs/integration-evidence.md`

- [ ] Document the admin standing-order workflow and scheduler endpoint.
- [ ] Run focused tests, full tests, typecheck, lint, and production build.
- [ ] Confirm no unrelated files are modified.

