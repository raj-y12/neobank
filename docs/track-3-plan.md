# Track 3 — Neobank Build Plan

Status: proposed plan, before implementation

The sendable T+2h scope is captured in [`attack-plan.md`](attack-plan.md). This document contains the fuller build sequence behind it.

Slice 1 is scoped separately in [`slice-1-plan.md`](slice-1-plan.md).

This document defines the intended shape of the 48-hour Track 3 submission. It is a scope and sequencing document, not a substitute for the timestamped decision log in [`decisions.md`](../decisions.md).

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
