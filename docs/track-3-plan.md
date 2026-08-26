# Track 3 — Neobank Build Plan

Status: remediation plan, prepared 2026-08-25

The sendable T+2h scope is captured in [`attack-plan.md`](attack-plan.md). This document contains the fuller build sequence behind it.

Slice 1 is scoped separately in [`slice-1-plan.md`](slice-1-plan.md).

This document defines the intended shape of the 48-hour Track 3 submission. It is a scope and sequencing document, not a substitute for the timestamped decision log in [`decisions.md`](../decisions.md).

## Current remediation plan

This plan supersedes the original 48-hour sequencing for the remaining work. The agent surface (`app/api/agent/*`) was already implemented in an earlier pass and is not touched by this remediation — it stays as-is. The target of this pass is a reviewer-runnable, production-shaped ACH and card-account path with honest integration evidence.

### Phase 0 — Freeze the baseline and remove ambiguity

What to implement:

- Record the current baseline: `npm test`, `npm run typecheck`, `npm run build`, deployed URL, current Vercel environment modes, and provider dashboard references.
- Treat `origin/main` as the integration branch and preserve unrelated working-tree files.
- Replace stale documentation references to Column/demo headers with Increase/Supabase Auth behavior.
- Define one canonical business/account scope for the demo and one repeatable seed path.

Verification:

- All three checks pass.
- `git rev-list --left-right --count origin/main...HEAD` is zero.
- README, evidence pack, seed file, and route behavior describe the same system.

Guardrails:

- Do not modify the existing agent surface in this plan; it is already implemented and out of scope for this remediation.
- Do not claim live integration status from an environment variable alone; require a provider request or webhook evidence ID.

### Phase 1 — Make Increase ACH a complete, observable rail

What to implement:

- Normalize Increase transfer events for both inbound funding and outbound payments.
- Resolve webhook events to either `funding_transfers` or `payments` by provider transfer ID, scoped to the owning business/account.
- Verify Increase signatures at the public webhook boundary; keep the internal event processor non-public or secret-protected.
- Complete `PENDING → SUBMITTED → SETTLED/RETURNED` for outbound payments and `PENDING → SETTLED/RETURNED` for inbound funding.
- Add provider transfer IDs, webhook IDs, event type, and last provider status to the payment/funding read models.
- Require the configured Increase account and counterparty routing details before selecting live mode; otherwise show an explicit simulator state.
- Keep idempotency across duplicate webhook delivery and retries.

Verification:

- Create a sandbox inbound transfer, settle it, observe the signed webhook, and verify the available balance and ledger entry.
- Create an outbound payment, approve it with a second user, submit it to Increase, settle it, and verify payment status plus ledger entry.
- Return the same transfer and verify one reversal entry, no duplicate balance effect, and a visible returned status.
- Replay the same webhook twice and send it out of order; verify one economic effect and a parked/reconciled event.

Guardrails:

- Never update a settled journal entry; use a new reversal entry.
- Never let a provider balance replace the ledger balance.
- Never accept an unsigned call to the internal payment-rail event handler.

### Phase 2 — Finish Plaid inbound funding and balance correctness

What to implement:

- Reconcile the migration and seed schema around encrypted Plaid access tokens and encrypted account/routing numbers.
- Remove stale seed columns and add a complete linked-bank seed/test path.
- Keep the Plaid access token encrypted at rest and never return it to the browser or logs.
- Ensure Add Money always creates cents correctly, records a pending transfer, and changes available balance only after settlement.
- Add a clear pending/settled/returned funding history to the funding/account surfaces.

Verification:

- Link a Plaid Sandbox account, create `$500.00`, verify the stored amount is `50000`, and verify no balance increase while pending.
- Settle through Increase webhook and verify available balance increases by exactly `50000`.
- Return it and verify the reversal restores the previous balance.

Guardrails:

- Do not reintroduce plaintext provider credentials.
- Do not use a UI-only simulation as proof of settlement.

### Phase 3 — Harden maker-checker and outbound payment UX

What to implement:

- Make the approval queue read real payment and approval records, including approval history and rejection state.
- Enforce `ADMIN`/`MEMBER` behavior consistently at the API boundary.
- Require a different active business member above the `$1,000.00` threshold.
- Add explicit reject behavior and idempotent approve/reject handling.
- Re-check available funds immediately before provider submission.
- Make direct-under-threshold submissions and approved-over-threshold submissions use the same provider-event lifecycle.

Verification:

- Member creates a `$1,240.00` payment; it appears in the queue as pending.
- Same member cannot approve it; a second active member can.
- Repeated approval cannot submit twice.
- Rejected payments never reach Increase.
- A payment with insufficient funds is blocked before submission.

Guardrails:

- No client-provided role or business ID is trusted.
- No approval route may operate on a record outside the authenticated business.

### Phase 4 — Replace demo reconciliation with real file reconciliation

What to implement:

- Define the supported Increase scheme/export row format and parser.
- Store an immutable reconciliation file receipt and idempotent row identity.
- Diff provider rows against ledger/payment/funding references and amounts.
- Persist missing-provider, missing-ledger, amount-mismatch, duplicate, and aged breaks.
- Add break resolution with notes and audit history; resolution must not edit the ledger.
- Remove or clearly isolate the current “Plant demo break” control from the reviewer path.

Verification:

- Import a clean file with zero breaks.
- Remove one provider row, alter one amount, and add one unknown row; verify three distinct breaks.
- Re-import the same file and verify no duplicates.
- Resolve a break and verify the ledger remains unchanged.

Guardrails:

- Reconciliation is evidence about provider state; it cannot silently rewrite customer truth.
- File references, provider row IDs, and business scope must be mandatory.

### Phase 5 — Repair card inventory and transaction correctness

What to implement:

- Add a repeatable admin-only card sync/import path so existing Lithic cards are associated without hardcoding provider tokens in a migration.
- Enforce that admins see all cards for their business while members see only cards delegated to them.
- Enforce the same ownership check on card detail, transaction detail, and card APIs.
- Extend the card transaction model to preserve multiple captures, incremental authorizations, partial captures, over-captures, expiry, and reversal relationships as separate provider events/derived state.
- Keep authorization holds, settlement, expiry, and return ledger effects idempotent.

Verification:

- Sync existing sandbox cards and issue a new one; all appear once.
- Delegate one card to an employee; the employee sees only that card.
- Replay authorization, incremental auth, partial capture, over-capture, expiry, and return events; verify the hold and ledger invariants.

Guardrails:

- Never assign cards across businesses based only on a global Lithic account.
- Never expose PAN or provider secrets in the UI.

### Phase 6 — Complete production auth and tenant security

What to implement:

- Keep direct employee login provisioning because email delivery is unavailable, but add an initial-password/forced-password-change state.
- Add password reset/change support before production handoff.
- Add missing RLS policies for onboarding, linked funding accounts, payment events, and reconciliation files.
- Set fixed search paths on database functions and enable leaked-password protection.
- Audit every service-role route for authenticated business ownership and role checks.
- Add cross-business and member/admin authorization tests.

Verification:

- A member cannot read or mutate another business’s records.
- A member cannot approve, delegate cards, resolve reconciliation, or issue cards unless explicitly allowed.
- Provider tokens and initial passwords do not appear in logs or persistent application data.
- Supabase security advisors show no unresolved application-owned warnings.

Guardrails:

- Service-role access is never treated as authorization by itself.
- Do not use editable user metadata for role decisions.

### Phase 7 — Submission evidence and freeze

What to implement:

- Update README and the evidence pack with exact live/simulated labels and environment requirements.
- Add a complete seed script for business, auth users, memberships, onboarding, linked funding, opening ledger, cards, and employee/card delegation.
- Add a cut list; note the agent surface is implemented (`app/api/agent/*`) and in scope, not cut.
- Capture provider dashboard screenshots, webhook delivery IDs, request IDs, and representative ledger/payment/reconciliation rows.
- Run the five-minute reviewer rehearsal against the deployed URL.

Verification:

- A fresh reviewer can seed, log in, fund, settle, send, approve, return, reconcile, and inspect statements without undocumented manual database changes.
- The evidence pack proves each live adapter and labels every simulator honestly.
- Final branch is clean except intentionally ignored local files and is pushed to `main` in small phase commits.

### Commit slices

Keep commits small and reviewable:

1. Increase event normalization and outbound settlement/return.
2. Plaid/inbound funding schema, settlement, and balance fixes.
3. Maker-checker role and approval hardening.
4. Reconciliation file ingestion and breaks.
5. Card sync, scoping, and transaction model.
6. Auth/RLS/security hardening.
7. Seed, README, evidence pack, and final verification.

## Objective

Demonstrate a deployed US business-current-account product in which:

1. A business passes KYB before its account becomes active.
2. The business funds its account from a linked external bank.
3. A sandbox card is issued to a team member.
4. A card authorization creates a hold without changing the ledger balance.
5. A later settlement can differ from the authorization amount.
6. A reversed settlement corrects the historical position without editing history.
7. An outbound payment above a threshold requires a second human approver.
8. Provider events are idempotently ingested and reconciled against our ledger.

The core product is the immutable, double-entry, bitemporal ledger. Providers are adapters around it.

## Owned use cases

### 1. Onboarding and funding

- Submit a business for KYB.
- Show pending, approved, and rejected states.
- Activate an approved business account.
- Link an external bank account.
- Create an inbound funding event.
- Reflect the funding in the account ledger and statement.

### 2. Card authorization and settlement

- Issue a sandbox card.
- Authorize a $50 fuel-pump transaction.
- Reduce available balance while leaving ledger balance unchanged.
- Capture $73.40 two days later.
- Release the hold exactly once.
- Post the settled amount to the ledger.
- Reverse the settlement later using reversal and re-booking entries.

### 3. Controlled outbound payment

- Initiate an outbound payment.
- Route payments above the threshold to a human approval queue.
- Prevent the initiator from approving their own payment.
- Settle the payment through a rail adapter.
- Handle a delayed return or recall.
- Show the corrected account and statement position.

## Required system boundaries

```text
Provider API/webhook
        ↓
Provider adapter
        ↓
Normalized provider-event inbox
        ↓
Idempotent domain handler
        ↓
Append-only ledger and event history
        ↓
Derived balances, statements, approvals, reconciliation
```

The system must never use a provider balance as its own source of truth.

## Core invariants

- Money is represented in USD cents, never floating point.
- Ledger entries are double-entry and append-only.
- Financial rows are never updated or deleted.
- Every external money event has a provider reference and idempotency key.
- Duplicate webhook delivery produces one economic effect.
- Out-of-order events are parked and matched later.
- Available balance is derived from ledger balance and active holds.
- A hold can be released exactly once.
- Corrections are reversal entries plus re-booking, never edits.
- Value date and booking date are stored separately.
- Statements are reproducible for any requested date.
- Agents can initiate work but cannot approve or execute their own money-out action.

## Planned product surfaces

Keep the UI deliberately narrow:

1. Account dashboard — ledger balance, available balance, active holds, recent activity.
2. Card transaction detail — authorization, captures, hold, settlement, reversal, provider events.
3. Payment approval queue — initiator, amount, status, approval history.
4. Reconciliation breaks — missing, mismatched, and aged items.
5. Historical statement view — corrected position by value date and what was known by booking date.

Each important screen needs default, loading, empty, error, and at least one edge state.

## Integration approach

The initial provider targets are:

- Card issuing: live sandbox integration; Lithic or Stripe Issuing.
- KYB/KYC: live sandbox integration; Persona or Middesk.
- Open banking: Plaid Sandbox where setup permits; otherwise a clearly labelled simulator.
- Payment rail: live or simulated behind the same adapter interface.
- USDC: live testnet strongly preferred, but not allowed to endanger the core loop.

Every integration must be labelled `live` or `simulated` in the README and evidence pack.

## 48-hour sequence

### T0–T+2: attack plan

- Confirm the three owned use cases.
- List provider choices and live/simulated status.
- Write ledger and correction invariants.
- Create the initial cut list.
- Record unanswered questions and working assumptions.

### T+2–T+8: ledger foundation

- Build the account, journal, journal-line, hold, and provider-event foundations.
- Implement integer-cent money handling.
- Implement idempotency and event parking.
- Seed believable demo data.
- Test ledger balance and hold invariants before UI polish.

### T+8–T+16: card path

- Connect the live issuing sandbox.
- Receive and verify authorization, capture, and reversal webhooks.
- Demonstrate the $50 authorization and different-amount settlement.
- Deploy early and keep the deployed URL working.

### T+16–T+24: money-moves checkpoint

- Complete the minimal KYB flow.
- Complete card creation and the authorization path.
- Provide the deployed URL and integration evidence.
- Write an honest checkpoint note if anything is incomplete.

### T+24–T+34: payments and approvals

- Implement outbound payment initiation.
- Add maker-checker approval behavior.
- Handle settlement, return, and recall events.
- Implement the minimal agent surface.

### T+34–T+42: statements and reconciliation

- Implement bitemporal correction behavior.
- Implement reproducible statements.
- Implement scheme-file reconciliation.
- Add the breaks screen and aging.

### T+42–T+48: live-fire rehearsal and freeze

- Replay duplicate and out-of-order webhooks.
- Run the authorization, capture, reversal, and approval attacks.
- Remove one scheme-file row and verify the break appears.
- Simulate provider webhook downtime and verify graceful status.
- Freeze commits, record the five-minute walkthrough, and assemble evidence.

## Agent surface

Minimum implementation:

- Three read tools for balances, transactions, and card holds.
- One write tool for creating an outbound payment.
- The write tool always lands in the human approval queue when approval is required.

Operations that must remain human-only:

- Approving payments.
- Posting manual ledger entries.
- Reversing or correcting transactions.
- Changing KYB status.
- Issuing or cancelling cards.
- Resolving reconciliation breaks.
- Changing thresholds or permissions.

## Cut list

The following are out of the core path unless all required behavior is already stable:

- Full native mobile application.
- Broad public API.
- Wires.
- Production-grade USDC payout and FX acceptance flow.
- Advanced card controls.
- Interest and fee accrual.
- Disputes and provisional credits.
- Sub-accounts or pots.
- Complex standing-order UI.
- Advanced analytics and reporting.
- Multi-currency support.

## Completion bar

The plan is successful when a reviewer can open the deployed URL and observe the complete money path, then replay the stated failure cases while the system preserves ledger correctness, historical statements, approval controls, and reconciliation visibility.
