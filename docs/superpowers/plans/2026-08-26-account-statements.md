# Account Statements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an authenticated account-level statement experience that reproduces daily balances and bitemporal corrections from the immutable journal.

**Architecture:** Add a pure account-statement projection over existing journal entries, then load only the authenticated business/account scope in a repository adapter. Keep the existing card correction view as a scoped drill-down, while `/statements` becomes the primary account statement route with current and historical knowledge views.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase service-role repository, Vitest, existing CSS primitives.

**Spec:** `docs/superpowers/specs/2026-08-26-account-statements-design.md`

## Global Constraints

- USD only; all monetary values are integer cents.
- Journal entries and postings remain append-only; corrections are new reversal entries.
- `value_date` selects the statement period; `created_at`/booking timestamp selects the historical knowledge cutoff.
- Business and account scope must come from `getAuthenticatedScope()`; environment defaults are not valid for authenticated statements.
- Holds are displayed separately from posted cash activity but still contribute their available-balance impact to reconciliation.
- Preserve the existing card correction route as a drill-down and do not add a mutable statement table.

---

### Task 1: Add the pure account-statement projection

**Files:**
- Create: `src/domain/account-statement.ts`
- Create: `src/domain/account-statement.test.ts`

**Interfaces:**
- Consumes: journal entries with `id`, `entryType`, `valueDate`, `bookingTimestamp`, references, and postings containing account code plus debit/credit cents.
- Produces: `projectAccountStatement(entries, { statementDate, asOfBookingTimestamp? })` returning `AccountStatement` with opening/closing ledger, available, and hold balances plus `postedRows` and `holdRows`.

- [ ] **Step 1: Write the failing tests**

Add literal fixtures for an opening balance, a $50 authorization hold on Monday, a $73.40 clearing on Tuesday that releases the hold, and a Thursday-learned reversal correcting Tuesday's value date. Assert the authorization-day statement separately for hold classification, then assert the corrected Tuesday statement:

```ts
const current = projectAccountStatement(entries, { statementDate: "2026-08-25" });
expect(current.openingLedgerBalanceCents).toBe(100_000);
expect(current.openingAvailableBalanceCents).toBe(100_000);
expect(current.openingHoldsCents).toBe(0);
expect(current.closingLedgerBalanceCents).toBe(100_000);
expect(current.closingAvailableBalanceCents).toBe(100_000);
expect(current.closingHoldsCents).toBe(0);
expect(current.postedRows.map((row) => row.entryType)).toEqual(["CARD_CLEARING", "CARD_SETTLEMENT_REVERSAL"]);
expect(current.holdRows).toEqual([]);
expect(current.postedRows.at(-1)?.runningAvailableBalanceCents).toBe(100_000);
```

Also assert that a hold's available impact is included in the running/reconciliation calculation, same-day ordering uses value date then booking timestamp then ID, an `asOf` before the reversal excludes it, and an empty date returns zero activity with balances carried from prior entries.

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npx vitest run src/domain/account-statement.test.ts`

Expected: FAIL because `src/domain/account-statement.ts` and `projectAccountStatement` do not exist.

- [ ] **Step 3: Implement the minimal projection**

Implement:

```ts
export type StatementRowKind = "POSTED" | "HOLD" | "CORRECTION";

export type AccountStatementRow = {
  journalEntryId: string;
  kind: StatementRowKind;
  entryType: string;
  valueDate: string;
  bookingTimestamp: string;
  bookingDate?: string;
  referenceId: string | null;
  reversalOfReferenceId: string | null;
  postedAmountCents: number;
  availableBalanceImpactCents: number;
  holdImpactCents: number;
  runningAvailableBalanceCents: number;
};

export type AccountStatement = {
  statementDate: string;
  asOfBookingTimestamp?: string;
  openingLedgerBalanceCents: number;
  openingAvailableBalanceCents: number;
  openingHoldsCents: number;
  closingLedgerBalanceCents: number;
  closingAvailableBalanceCents: number;
  closingHoldsCents: number;
  postedRows: AccountStatementRow[];
  holdRows: AccountStatementRow[];
};
```

Filter entries by `bookingTimestamp <= asOfBookingTimestamp` when supplied. Derive account nets from postings (`CUSTOMER_AVAILABLE`, `CUSTOMER_CARD_HOLDS`, and `CUSTOMER_PAYMENT_HOLDS`), use entries before the date for opening balances, and use entries on the date for rows and closing balances. Classify pure hold/release entries as `HOLD`, reversal entry types as `CORRECTION`, and other available-affecting entries as `POSTED`. Preserve both posted amount and available/hold impacts so a clearing can show cash movement and hold release separately.

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `npx vitest run src/domain/account-statement.test.ts`

Expected: all projection tests PASS.

- [ ] **Step 5: Commit the domain projection**

```bash
git add src/domain/account-statement.ts src/domain/account-statement.test.ts
git commit -m "feat: project bitemporal account statements"
```

### Task 2: Add an authenticated account-statement repository

**Files:**
- Create: `src/repositories/account-statement-repository.ts`
- Create: `src/repositories/supabase-account-statement-repository.ts`
- Create: `src/repositories/supabase-account-statement-repository.test.ts`

**Interfaces:**
- Consumes: `LedgerScope` and `StatementQuery` from Task 1.
- Produces: `getAccountStatement(scope, query): Promise<AccountStatement>` and `getLatestStatementDate(scope): Promise<string | null>`.

- [ ] **Step 1: Write failing repository contract tests**

Use a typed fake Supabase query boundary to assert that the repository applies both `business_id = scope.businessId` and `account_id = scope.accountId`, passes `created_at <= asOf` when requested, maps persisted `booking_date` and `created_at`, and never substitutes `LEDGER_BUSINESS_ID` or `LEDGER_ACCOUNT_ID`. Add a test that a missing latest date returns `null`.

- [ ] **Step 2: Run the focused repository tests to verify they fail**

Run: `npx vitest run src/repositories/supabase-account-statement-repository.test.ts`

Expected: FAIL because the repository files do not exist.

- [ ] **Step 3: Implement scoped journal loading**

Load journal entries joined with postings through the existing service-role client, filter by the authenticated scope, and delegate all balance/row semantics to `projectAccountStatement`. Load all scoped rows with `value_date <= statementDate` so opening balances and the selected day's rows can be derived; for `asOf`, also apply the booking timestamp cutoff. Query the latest scoped `value_date` for the default route. Throw the existing configuration error when Supabase is not configured.

- [ ] **Step 4: Run focused repository tests to verify they pass**

Run: `npx vitest run src/repositories/supabase-account-statement-repository.test.ts src/domain/account-statement.test.ts`

Expected: all repository and projection tests PASS.

- [ ] **Step 5: Commit the repository layer**

```bash
git add src/repositories/account-statement-repository.ts src/repositories/supabase-account-statement-repository.ts src/repositories/supabase-account-statement-repository.test.ts
git commit -m "feat: load scoped account statement journals"
```

### Task 3: Build the `/statements` account statement surface

**Files:**
- Create: `app/statements/page.tsx`
- Create: `app/statements/statement-controls.ts`
- Create: `app/statements/statement-controls.test.ts`
- Modify: `app/globals.css`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `getAuthenticatedScope`, `getAccountStatement`, and `getLatestStatementDate` from Tasks 1–2.
- Produces: authenticated `/statements?date=YYYY-MM-DD&asOf=ISO-8601` page with account-level balances, posted activity, hold activity, and correction links.

- [ ] **Step 1: Write a failing page/route characterization test**

Add `app/statements/statement-controls.ts` with testable date parser/formatter helpers. Assert valid UTC dates are accepted, malformed dates are rejected, and a datetime-local input is converted to an exact ISO cutoff without silently changing the selected day. Assert the dashboard statement destination is `/statements`, not `statements/card/card-4821`.

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npx vitest run app/statements/statement-controls.test.ts`

Expected: FAIL because the account statement route/helpers do not exist and the dashboard still uses the hardcoded destination.

- [ ] **Step 3: Implement the server-rendered account statement page**

Resolve `getAuthenticatedScope()` and pass its `businessId`/`accountId` to the repository. Default to the latest scoped value date, render a no-activity state for empty periods, validate query parameters, and render errors through the page's error state rather than a blank server failure. Show:

```text
Statement date / Current corrected or Known at timestamp
Opening ledger / opening available / opening holds
Posted activity: value date, description, booked at, amount, running available
Holds and pending activity: hold/release amount and available impact
Closing ledger / closing available / closing holds
Opening available + posted impacts + hold impacts = closing available
```

Link card rows to `/statements/card/<real-internal-transaction-id>` only when the reference can be resolved; otherwise show the immutable journal reference. Add loading, empty, error, and current-vs-as-known copy.

- [ ] **Step 4: Replace dashboard hardcoded statement links**

Change both statement links in `app/page.tsx` to `/statements`. Keep card detail links generated from real transaction IDs inside card activity.

- [ ] **Step 5: Add focused statement styles**

Add styles for balance summary, reconciliation equation, posted/hold sections, running balance column, correction badges, responsive overflow, and accessible empty/error states using existing CSS variables and components.

- [ ] **Step 6: Run page typecheck/build checks**

Run: `npm run typecheck && npm run lint`

Expected: PASS with no new warnings or errors.

- [ ] **Step 7: Commit the account statement surface**

```bash
git add app/statements/page.tsx app/statements/statement-controls.ts app/statements/statement-controls.test.ts app/globals.css app/page.tsx
git commit -m "feat: add account statement experience"
```

### Task 4: Secure and clarify the card correction drill-down

**Files:**
- Modify: `app/statements/card/[transactionId]/page.tsx`
- Modify: `src/repositories/supabase-ledger-statement-repository.ts`
- Modify: `src/repositories/supabase-ledger-statement-repository.test.ts`

**Interfaces:**
- Consumes: authenticated scope and existing card/business repositories.
- Produces: a card correction detail view that cannot read another business's card or fall back to environment scope.

- [ ] **Step 1: Write failing scoping tests**

Assert the card statement reader requires a `LedgerScope`, applies scope before loading the card transaction, rejects a transaction not owned by the scope as not found, and does not read `LEDGER_*` values. Assert the page obtains scope through `getAuthenticatedScope()`.

- [ ] **Step 2: Run focused tests to verify they fail**

Run: `npx vitest run src/repositories/supabase-ledger-statement-repository.test.ts`

Expected: FAIL because the current reader accepts optional scope and the page supplies environment defaults.

- [ ] **Step 3: Implement ownership-first lookup**

Require scope in `getLedgerStatement` for transaction detail. Resolve the card transaction through the business's card association/card token, then load journal references only after ownership is established. Return a not-found result for foreign IDs without revealing ownership. Update the page to call `getAuthenticatedScope()` and pass that scope.

- [ ] **Step 4: Run focused tests to verify they pass**

Run: `npx vitest run src/repositories/supabase-ledger-statement-repository.test.ts src/domain/card-return-allocation.test.ts src/domain/ledger-statement.test.ts`

Expected: all detail and existing bitemporal tests PASS.

- [ ] **Step 5: Commit the scoped drill-down**

```bash
git add app/statements/card/[transactionId]/page.tsx src/repositories/supabase-ledger-statement-repository.ts src/repositories/supabase-ledger-statement-repository.test.ts
git commit -m "fix: scope card statement drill-down"
```

### Task 5: Verify the live-fire correction and submission path

**Files:**
- Modify: `src/domain/account-statement.test.ts`
- Modify: `src/repositories/supabase-account-statement-repository.test.ts`
- Modify: `docs/integration-evidence.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: all statement projection, repository, and UI behavior from Tasks 1–4.
- Produces: repeatable evidence instructions for the corrected statement and a current documentation path for reviewers.

- [ ] **Step 1: Add the complete live-fire fixture**

Use immutable journal fixtures for opening $1,000.00, $50.00 authorization, $73.40 clearing two days later, and a later $73.40 reversal learned on Thursday but valued on the clearing date. Assert:

```ts
const asKnownWednesday = projectAccountStatement(entries, {
  statementDate: "2026-08-25",
  asOfBookingTimestamp: "2026-08-26T23:59:59Z",
});
const corrected = projectAccountStatement(entries, { statementDate: "2026-08-25" });

expect(asKnownWednesday.postedRows.some((row) => row.kind === "CORRECTION")).toBe(false);
expect(corrected.postedRows.some((row) => row.kind === "CORRECTION")).toBe(true);
expect(corrected.closingAvailableBalanceCents).toBe(asKnownWednesday.closingAvailableBalanceCents + 7_340);
```

Assert the reconciliation equation with both posted and hold impacts, and assert the original clearing remains unchanged.

- [ ] **Step 2: Update reviewer documentation**

Document `/statements`, the date/knowledge controls, the correction scenario, authenticated demo setup, and the distinction between account statement and card drill-down in `README.md` and `docs/integration-evidence.md`. Remove the hardcoded card-ID assumption.

- [ ] **Step 3: Run the complete verification suite**

Run:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Expected: all tests pass, lint is clean, and the production build completes successfully.

- [ ] **Step 4: Verify the reviewer path locally**

With the local app running, request `/statements`, `/statements?date=YYYY-MM-DD`, and `/statements/card/<real-id>` without a session. Each must redirect to `/login?next=…`; `/login` must remain `200`. With an authenticated demo session, verify opening/closing balances, hold separation, current correction, and historical `asOf` output.

- [ ] **Step 5: Commit the final evidence/documentation update**

```bash
git add src/domain/account-statement.test.ts src/repositories/supabase-account-statement-repository.test.ts docs/integration-evidence.md README.md
git commit -m "docs: verify account statement correction path"
```
