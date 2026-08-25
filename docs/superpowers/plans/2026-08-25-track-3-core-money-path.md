# Track 3 Core Money Path Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the neobank demo runnable end to end: approved business → linked funding source → settled inbound ACH → derived balances → above-threshold outbound payment → second-user approval → provider submission → return/recall → reconciliation break.

**Architecture:** Keep providers behind adapter interfaces and keep the append-only, double-entry, bitemporal ledger as the source of customer truth. Use Supabase migrations and service repositories for durable state, with deterministic simulated provider events available behind the same Column/Plaid/Persona/Lithic boundaries. Expose narrow Next.js pages and API routes for onboarding, funding, payments, approvals, reconciliation, and agent tools.

**Tech Stack:** Next.js App Router, TypeScript, Supabase Postgres/RPC, Vitest, existing Lithic/domain/repository patterns.

**Spec:** User-provided Track 3 brief in `/Users/rajyendamuri/.codex/attachments/6e0c4560-ad0a-4f96-9994-78684189d5b1/pasted-text.txt`.

## Global Constraints

- Money is integer USD cents.
- Ledger history is append-only and immutable.
- Value date and booking date are distinct and statements use booking date correctly.
- Available balance is derived from settled ledger balance minus active holds and uncleared credits do not increase it.
- Provider operations are idempotent and out-of-order events are parked/matched without double-posting.
- Every application record is business-scoped and protected by RLS plus server-side authorization.
- Plaid credentials are never stored plaintext or exposed to browser code.
- Persona and Lithic remain live-sandbox integrations; simulated fallbacks are explicitly labelled.
- USDC, wires, standing orders, batch payments, native mobile, and full beneficiary management are deferred.

### Task 1: Establish the payment/funding/approval/reconciliation schema

**Files:**
- Create: `supabase/migrations/20260825180000_create_business_payment_core.sql`
- Create: `src/domain/payment-lifecycle.ts`
- Create: `src/domain/payment-lifecycle.test.ts`

**Interfaces:**
- Produces `PaymentStatus`, `FundingStatus`, `ApprovalDecision`, and transition guards consumed by routes and repositories.
- Tables include `businesses`, `business_members`, `onboarding_verifications`, `linked_funding_accounts`, `funding_transfers`, `payments`, `payment_approvals`, `payment_events`, `reconciliation_files`, and `reconciliation_breaks`, all with business/account scope and provider/idempotency fields.

- [ ] Write tests proving valid funding/payment transitions, invalid transitions, distinct approver enforcement, and threshold routing.
- [ ] Run `npm test -- src/domain/payment-lifecycle.test.ts` and verify the new tests fail for missing module/behavior.
- [ ] Implement the smallest pure transition/approval functions and migration constraints.
- [ ] Re-run the focused tests, then run the existing domain suite.

### Task 2: Fix ledger correctness and statement bitemporality

**Files:**
- Modify: `supabase/migrations/20260825170000_p0_ledger_scope_atomic_and_event_ordering.sql`
- Create: `supabase/migrations/20260825181000_harden_rls_and_journal_balance.sql`
- Modify: `src/domain/ledger-statement.ts`
- Modify: `src/domain/ledger-statement.test.ts`
- Modify: `src/repositories/supabase-ledger-statement-repository.ts`

- [ ] Add failing tests for unbalanced journal rejection, business-scope rejection, and booking-date statement ordering.
- [ ] Run focused tests and verify expected failures.
- [ ] Add an RPC check that total debits equal total credits before inserting postings, enforce scope, and add explicit RLS policies for application tables.
- [ ] Change statement queries to use persisted `booking_date` and retain value-date filtering for economic history.
- [ ] Run ledger/repository tests and migration lint/type checks.

### Task 3: Add onboarding and funding adapter boundaries

**Files:**
- Create: `src/integrations/payment-rail.ts`
- Create: `src/integrations/simulated-ach.ts`
- Create: `src/integrations/persona/client.ts`
- Create: `src/integrations/plaid/client.ts`
- Create: `src/domain/onboarding.ts`
- Create: `src/domain/funding.ts`
- Create: `src/domain/funding.test.ts`
- Create: `app/api/onboarding/route.ts`
- Create: `app/api/webhooks/persona/route.ts`
- Create: `app/api/funding/link-token/route.ts`
- Create: `app/api/funding/exchange/route.ts`
- Create: `app/api/funding/route.ts`
- Create: `app/api/webhooks/payment-rail/route.ts`

- [ ] Write failing tests for approval gating, funding initiation, settlement idempotency, delayed settlement, and return reversal.
- [ ] Verify red.
- [ ] Implement provider-neutral interfaces and simulated ACH behavior, with live adapters selected only by configured environment variables.
- [ ] Encrypt Plaid access tokens with an application secret before persistence; persist only masked display data for UI.
- [ ] Implement onboarding status monotonicity and provider-event inbox idempotency.
- [ ] Verify green and run the repository/domain suite.

### Task 4: Implement outbound payments and maker-checker

**Files:**
- Create: `src/domain/payment-service.ts`
- Create: `src/domain/payment-service.test.ts`
- Create: `src/repositories/payment-repository.ts`
- Create: `src/repositories/supabase-payment-repository.ts`
- Create: `app/api/payments/route.ts`
- Create: `app/api/payments/[id]/approve/route.ts`
- Create: `app/api/payments/[id]/reject/route.ts`
- Create: `app/api/approvals/route.ts`

- [ ] Write failing tests for threshold routing, insufficient available funds, self-approval rejection, second-user approval, exactly-once provider submission, settlement, return, and recall.
- [ ] Verify red.
- [ ] Implement immutable payment events and approval records; route all agent-originated writes into the same queue.
- [ ] Submit to the rail only after approval and post immutable ledger entries for settlement/return.
- [ ] Verify green and run all payment/ledger tests.

### Task 5: Add reconciliation ingestion, breaks, and aging

**Files:**
- Create: `src/domain/reconciliation.ts`
- Create: `src/domain/reconciliation.test.ts`
- Create: `src/repositories/reconciliation-repository.ts`
- Create: `src/repositories/supabase-reconciliation-repository.ts`
- Create: `app/api/reconciliation/route.ts`
- Create: `app/reconciliation/page.tsx`

- [ ] Write failing tests for in-file-not-ledger, in-ledger-not-file, amount mismatch, duplicate file ingestion, and aging buckets.
- [ ] Verify red.
- [ ] Implement normalized provider report rows, deterministic diffing, break status/aging, and resolution notes without mutating ledger history.
- [ ] Verify green and add one seeded planted break.

### Task 6: Add agent read tools and approval-queue write tool

**Files:**
- Create: `app/api/agent/account-summary/route.ts`
- Create: `app/api/agent/payment-status/route.ts`
- Create: `app/api/agent/reconciliation-breaks/route.ts`
- Create: `app/api/agent/submit-payment/route.ts`
- Create: `src/domain/agent-tools.test.ts`

- [ ] Write failing tests proving all reads are business-scoped and the write creates a pending payment without approval/submission.
- [ ] Verify red.
- [ ] Implement authenticated role checks, stable JSON contracts, audit metadata, and no direct provider side effects from the agent write.
- [ ] Verify green.

### Task 7: Build runnable demo surfaces and seed/evidence pack

**Files:**
- Create: `app/onboarding/page.tsx`
- Create: `app/funding/page.tsx`
- Create: `app/payments/page.tsx`
- Create: `app/approvals/page.tsx`
- Modify: `app/page.tsx`
- Create: `supabase/seed.sql`
- Create: `docs/integration-evidence.md`
- Modify: `README.md`
- Modify: `decisions.md`

- [ ] Add failing route/page smoke checks for the core dashboard links and seeded states.
- [ ] Implement narrow loading, empty, error, and live/simulated labels; show ledger vs available balance and payment/approval/reconciliation statuses.
- [ ] Seed one business, two members, onboarding result, linked account, settled funding, above-threshold payment, approval queue item, card lifecycle fixture, and planted reconciliation break.
- [ ] Document provider environment variables, webhook URLs, simulator commands, evidence screenshots/logs, and the final cut list.
- [ ] Run build, lint/typecheck, focused tests, full test suite, and a clean seeded smoke flow.

### Task 8: Verify security and hand off

**Files:**
- Modify: all service-role API routes that accept business/account/payment IDs
- Create: `src/auth/authorization.ts`
- Create: `src/auth/authorization.test.ts`
- Modify: `README.md`

- [ ] Write failing tests for cross-business access, MEMBER/ADMIN authorization, and missing authenticated identity.
- [ ] Verify red.
- [ ] Centralize authorization predicates and apply them to every route; reject cross-scope references before service-role queries.
- [ ] Verify RLS policies cover every application table and confirm secrets are absent from tracked files.
- [ ] Run final verification and record exact commands/results in the evidence pack.
