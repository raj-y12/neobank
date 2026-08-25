# Settlement Reversal and Bitemporal Statement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the Track 3 card lifecycle by explicitly linking a standalone Lithic return to its original settlement, posting an immutable reversal, showing the linked activity, and proving the corrected position through a bitemporal statement.

**Architecture:** Lithic remains the provider-event source, while internal transaction IDs, reversal intents, journal entries, and relationships remain owned by the application. A return is never auto-linked from merchant/card/amount similarity; it is either linked through an internal reversal intent or remains `UNMATCHED_RETURN`. Balances and statements are derived from append-only journal postings using value date and booking timestamp separately.

**Tech Stack:** Next.js App Router, TypeScript, Supabase Postgres through the existing provider-agnostic repository boundary, Lithic sandbox webhooks, Vitest.

**Spec:** Track 3 — Neobank brief in the work-trial prompt; existing decisions in `decisions.md`, especially D-009, D-012, D-014, and D-016.

## Global Constraints

- USD only, represented as integer cents.
- Ledger rows are append-only and immutable; corrections are reversal entries plus a re-book, never edits.
- Every provider event is signature-verified, idempotent, and safe to receive out of order.
- Provider IDs are external references; internal transaction and reversal IDs are application-owned.
- A valid standalone provider return without an internal link remains visible as `UNMATCHED_RETURN` and immediately credits the customer balance. Later linking updates only the relationship and never creates a second credit (D-020).
- `value_date` is the date the money applies to; `created_at`/booking timestamp is when the system recorded the truth.
- Do not add approvals, ACH, reconciliation, or statements beyond this focused card statement until this lifecycle is correct.

## Current State and Scope Boundary

Already implemented:

- Lithic card list and detail views.
- Internal card transaction/event projection.
- Authorization holds and different-amount clearing.
- Derived ledger and available balances.
- Authorization reversal hold release.
- Double-entry journal idempotency and Supabase persistence.

This plan covers the remaining five deliverables:

1. Internal reversal-intent/link model.
2. Explicit linking of a standalone Lithic return.
3. Immutable settlement-reversal journal entry.
4. Linked transaction display in the modal.
5. Bitemporal corrected statement/balance verification.

## Open Decision Before Implementation

### Proposed operator-link flow

For the demo, the operator selects the original settled internal transaction, creates a reversal intent, then supplies the standalone Lithic return token after simulating the return in Lithic. The link operation validates card, currency, and expected amount. A valid return with no intent remains `UNMATCHED_RETURN` but its reversal is posted immediately; later linking changes only the relationship and creates no second credit (D-020).

This is intentionally explicit: the existing decision log says same-card, same-merchant, or same-amount matching is not sufficient evidence of a reversal relationship.

Question for Raj: should the demo expose this as a small “Link return” action in the transaction modal, or is an internal API/operator route acceptable for the live-fire demo?

---

## Phase 1 — Internal reversal-intent model

### Task 1: Add the reversal-intent schema

**Files:**
- Create: `supabase/migrations/<timestamp>_create_card_reversal_intents.sql`
- Modify: `decisions.md` only if the operator-link decision differs from D-016.

**Schema:**

```sql
create table public.card_reversal_intents (
  id uuid primary key default gen_random_uuid(),
  original_transaction_id uuid not null references public.card_transactions(id),
  card_token text not null,
  expected_amount_cents bigint not null check (expected_amount_cents > 0),
  provider_return_transaction_id text unique,
  status text not null check (status in ('PENDING', 'LINKED', 'POSTED', 'REJECTED')),
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  linked_at timestamptz,
  posted_at timestamptz
);

alter table public.card_transactions
  add column reversal_of_transaction_id uuid references public.card_transactions(id);
```

- Enable RLS on the new table.
- Keep it server/service-role only for this trial, matching the existing ledger tables.
- Add indexes for `original_transaction_id`, `provider_return_transaction_id`, and `status`.

**Verification:**

- Apply the migration to Supabase.
- Verify the table and columns with the Supabase table inspector/query.
- Run Supabase security and performance advisors; do not expose the service-role key to the browser.

### Task 2: Add domain types and repository interfaces

**Files:**
- Create: `src/domain/card-reversal.ts`
- Create: `src/repositories/card-reversal-repository.ts`
- Create: `src/repositories/supabase-card-reversal-repository.ts`
- Test: `src/domain/card-reversal.test.ts`

**Interfaces:**

```ts
export type CardReversalIntent = {
  id: string;
  originalTransactionId: string;
  cardToken: string;
  expectedAmountCents: number;
  providerReturnTransactionId: string | null;
  status: 'PENDING' | 'LINKED' | 'POSTED' | 'REJECTED';
  idempotencyKey: string;
};

export function validateReturnLink(input: {
  intent: CardReversalIntent;
  returnCardToken: string;
  returnAmountCents: number;
}): void;
```

`validateReturnLink` must reject a different card or amount and accept the exact expected amount. It must not infer an original transaction from similarity.

**TDD steps:**

- Write failing tests for matching card/amount, wrong card, and wrong amount.
- Run `npm test -- src/domain/card-reversal.test.ts` and confirm the expected failures.
- Implement the smallest domain validator.
- Re-run the focused test, then the full suite.
- Commit: `feat: add card reversal intent model`.

---

## Phase 2 — Explicitly link the Lithic return

### Task 3: Add the operator/API link operation

**Files:**
- Modify: `src/repositories/supabase-card-reversal-repository.ts`
- Create: `app/api/card-reversal-intents/route.ts`
- Create: `app/api/card-reversal-intents/[id]/link/route.ts`
- Test: `src/repositories/supabase-card-reversal-repository.test.ts` if repository test infrastructure is added; otherwise verify with Supabase SQL and endpoint calls.

**Operations:**

1. Create intent with `originalTransactionId`, `expectedAmountCents`, `cardToken`, and idempotency key.
2. Link the provider return token after checking the return card and amount.
3. Reject already-linked intents, wrong amounts, wrong cards, and duplicate provider return tokens.
4. Do not post the journal entry until the webhook projection has been received and the intent is safely matched, unless the link route is explicitly responsible for posting it exactly once.

**Recommended sequencing:** The link route stores the relationship only. The webhook remains responsible for projecting the provider return and creating the journal entry, which preserves the normal provider-event path.

**Verification:**

- Create one intent against the existing settled `$73.40` internal transaction.
- Link a matching simulated Lithic return token.
- Repeat the link request and confirm it is idempotent.
- Try a wrong amount and confirm the intent remains unchanged.
- Commit: `feat: link lithic returns to internal transactions`.

---

## Phase 3 — Project and post the settlement reversal

### Task 4: Add reversal linkage to the internal transaction projection

**Files:**
- Modify: `src/domain/lithic-transaction-projection.ts`
- Modify: `src/repositories/supabase-card-transaction-repository.ts`
- Modify: `src/repositories/supabase-card-transaction-reader.ts`
- Test: `src/domain/lithic-transaction-projection.test.ts`

**Projection behavior:**

- A linked return becomes a new internal `card_transactions` row.
- Its `reversal_of_transaction_id` points to the original internal settled transaction.
- Its provider transaction token and provider event ID remain separate external references.
- A return without an intent is projected as `UNMATCHED_RETURN` and has no reversal relationship.

**TDD steps:**

- Add a failing projection test for a linked return and an unmatched return.
- Confirm the unmatched return does not produce a relationship.
- Implement the projection fields and repository persistence.
- Run focused and full tests.
- Commit: `feat: project linked card settlement reversals`.

### Task 5: Post the immutable reversal journal entry

**Files:**
- Modify: `src/domain/ledger.ts`
- Modify: `app/api/webhooks/lithic/route.ts`
- Modify: `src/repositories/supabase-ledger-repository.ts`
- Test: `src/domain/ledger.test.ts`

**Journal entry:**

For a `$73.40` settlement reversal:

```text
Debit  CARD_SETTLEMENT_PAYABLE  $73.40
Credit CUSTOMER_AVAILABLE       $73.40
```

- `entry_type = CARD_SETTLEMENT_REVERSAL`.
- `reference_id` is the reversal transaction/provider reference.
- `reversal_of_reference_id` is the original transaction reference.
- `value_date` is the return event date.
- The idempotency key is based on provider event ID, so replaying the webhook cannot double-credit the customer.
- An unmatched return is stored and visible, and creates this journal entry immediately when its settlement amount is valid. The provider-event idempotency key prevents replay from creating a second entry; later linking is relational only (D-020).

**TDD steps:**

- Add failing tests for balanced reversal postings, original-reference retention, and positive amount validation.
- Run the focused test and verify failure.
- Implement the minimal journal function and webhook branch.
- Test a duplicate return webhook and verify one journal entry.
- Commit: `feat: post immutable settlement reversals`.

---

## Phase 4 — Show linked activity in the transaction modal

### Task 6: Replace broad related-transaction display with explicit relationships

**Files:**
- Modify: `src/repositories/supabase-card-transaction-reader.ts`
- Modify: `app/cards/[token]/TransactionActivity.tsx`
- Test: `src/domain/card-reversal.test.ts` or a focused reader mapping test.

**UI behavior:**

- The original settlement modal shows a “Reversal” related record only when `reversal_of_transaction_id` exists.
- The reversal modal shows “Reverses” with a link back to the original settlement.
- Related records are sorted newest first and display exact timestamps, status, amount, and internal ID.
- Unmatched returns show a clear `UNMATCHED_RETURN` state and do not appear as if they reverse another transaction.
- Remove the current behavior that lists every other card transaction as “related.”

**Verification:**

- Use one original settlement, one linked return, and one unmatched return.
- Confirm only the explicit pair is related.
- Confirm the modal shows both provider and internal identifiers.
- Commit: `feat: show explicit card reversal relationships`.

---

## Phase 5 — Bitemporal corrected statement and live-fire proof

### Task 7: Add a ledger statement reader

**Files:**
- Create: `src/domain/ledger-statement.ts`
- Create: `src/repositories/ledger-statement-repository.ts`
- Create: `src/repositories/supabase-ledger-statement-repository.ts`
- Test: `src/domain/ledger-statement.test.ts`

**Statement row shape:**

```ts
export type LedgerStatementRow = {
  journalEntryId: string;
  entryType: string;
  valueDate: string;
  bookingTimestamp: string;
  referenceId: string | null;
  reversalOfReferenceId: string | null;
  amountCents: number;
};
```

- Query journal entries and postings without mutating them.
- Filter/reproduce a statement by `value_date`.
- Preserve `created_at` as the booking timestamp.
- Sort by value date, then booking timestamp, then journal ID for deterministic output.
- Repeated reads of the same date must return identical rows and totals.

**TDD steps:**

- Write a failing test proving a Thursday reversal changes the Tuesday value-date statement while retaining Thursday booking timestamp.
- Add a deterministic sort test.
- Implement the pure statement projection.
- Run focused and full tests.
- Commit: `feat: add bitemporal ledger statements`.

### Task 8: Add the focused statement screen and live-fire verification

**Files:**
- Create: `app/statements/card/[transactionId]/page.tsx` or the smallest route consistent with the current navigation.
- Create: `app/statements/card/[transactionId]/StatementView.tsx` if client interactivity is needed.
- Modify: `app/cards/[token]/TransactionActivity.tsx` to link to the statement view.

**Screen requirements:**

- Show original settlement and reversal as separate immutable rows.
- Show value date and booking timestamp with time.
- Show corrected day total and current derived available/ledger balances.
- Show internal and provider references.
- Show empty, loading, error, and corrected states.

**Live-fire script:**

1. Start with `$1,000` ledger balance.
2. Simulate `$50` authorization; verify ledger remains `$1,000`, available becomes `$950`.
3. Capture `$73.40`; verify hold releases, ledger and available become `$926.60`.
4. Create/link a Lithic return for `$73.40`.
5. Replay the return webhook; verify exactly one reversal entry.
6. Verify available and ledger return to `$1,000`.
7. Open the settlement-day statement; verify the reversal is present without editing the original row.
8. Open the event timeline; verify the original and return timestamps are distinct.

Commit: `feat: prove bitemporal settlement correction`.

---

## Final Verification and Report

Run:

```bash
npm test
npm run typecheck
npm run build
git diff --check
```

Verify:

- The Supabase migration is applied and the new columns exist.
- All ledger entries balance.
- Replayed provider events produce no duplicate journal entries.
- Unmatched returns never change balances.
- Linked reversals restore the correct amount.
- Statements are reproducible and show value date separately from booking timestamp.
- The deployed URL contains the same behavior as local.
- Decision log records the operator-link choice, unmatched-return behavior, and cut list.

The completion report should include:

- Commit hashes by phase.
- Test/build results.
- Supabase migration and verification evidence.
- The exact live-fire transaction IDs used.
- Any intentionally unimplemented behavior, especially provider-initiated returns without an internal intent.
