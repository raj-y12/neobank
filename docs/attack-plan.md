# Track 3 — T+2h Attack Plan

Status: historical planning document. Current behavior and provider choices are defined in `README.md`, `decisions.md`, and `docs/integration-evidence.md`.

## Scope we will own end to end

The implemented Track 3 experience is organized around three flows:

### 1. Onboarding and funding

- A business submits onboarding/KYC information.
- The account remains pending until the business is approved.
- An approved business receives an active USD account.
- The business links an external bank and funds the account.

### 2. Card authorization and settlement

- A team member receives a sandbox card.
- A $50 fuel-pump authorization creates a hold.
- Available balance decreases while ledger balance remains unchanged.
- Two days later, the transaction settles for $73.40.
- The hold releases exactly once and the settled amount posts to the ledger.
- The settlement is reversed later through reversal and re-booking entries.

### 3. Controlled outbound payment

- A user initiates an outbound payment.
- Payments above the approval threshold enter a human approval queue.
- The initiator cannot approve their own payment.
- The payment can settle later and can subsequently return or be recalled.

## Provider picks

| Capability | Initial choice | Status | Fallback or scope note |
| --- | --- | --- | --- |
| Card issuing | Lithic sandbox | Live when configured | No alternate provider is part of the current implementation |
| Onboarding verification | Persona sandbox KYC | Live when configured | Full legal-entity KYB is deferred/provider-gated |
| External-bank funding | Plaid Sandbox | Live target | Same adapter boundary; use a clearly labelled simulator if setup is a time risk |
| Payment rail | Increase sandbox | Live when explicitly enabled | Internal simulator is the default fallback; live mode requires `PAYMENT_RAIL_MODE=LIVE` and a scoped provider account |
| USDC payout | Circle or Bridge testnet | Stretch | Cut if it threatens the core flow |

The available live integrations are Lithic card issuing, Persona owner KYC, Plaid bank linking, and Increase ACH when configured. Full legal-entity KYB remains deferred/provider-gated. Every integration will be labelled honestly as live or simulated in the README and evidence pack.

## System invariants we will protect

- USD money is stored as integer cents; no floating-point calculations.
- The ledger is double-entry, append-only, and immutable.
- Provider balances are not our source of truth.
- Available balance is derived from posted ledger entries minus active holds.
- Every provider event is signature-verified, idempotent, and safe to replay.
- Out-of-order events are parked and matched later.
- A hold releases exactly once, regardless of duplicate or unusual event sequences.
- Corrections are reversal entries plus re-booking, never edits.
- Value date and booking date are stored separately.
- Statements are reproducible and reflect later corrections.
- Agent writes create approval-queue items; agents cannot approve their own payments.

## First live-fire scenarios we will support

1. Authorize $50 and verify available balance changes while ledger balance does not.
2. Capture $73.40 two days later and verify the hold releases once.
3. Reverse the settlement and show the corrected settlement-day statement.
4. Deliver settlement before authorization and verify it is parked and matched later.
5. Replay a webhook and verify it creates no second economic effect.
6. Attempt self-approval and verify it is rejected.
7. Remove a scheme-file row and verify a reconciliation break appears.
8. Stop issuing webhooks temporarily and show that the customer sees a stale available balance until the provider retries; the app has no real-time fallback for an event it never received.

## Cut list v0

We will cut or defer the following unless the core flows are stable:

- Full native mobile application.
- Broad public API.
- Wires.
- Production-grade USDC and FX flow.
- Advanced card controls.
- Interest, fees, disputes, and provisional credits.
- Sub-accounts or pots.
- Complex standing-order UI.
- Advanced analytics.
- Multi-currency support.

We will still implement the minimum standing-order execution policy needed to prove once-only execution across retries and restarts, even if its UI is cut.

## Working assumptions

- The ledger currency is USD only, represented in cents.
- Uncleared inbound credits are not available to spend until a defined funding event is posted.
- The payment simulator uses the same interface as a real payment provider.
- A returned or recalled payment is represented by new reversal/correction entries.
- If provider setup differs from the assumptions above, the change and its consequence will be recorded in `decisions.md`.
