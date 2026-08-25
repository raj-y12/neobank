# Track 3 — P1 Onboarding, Funding, and Payment Controls

Status: scoped, ready to implement

## Goal

Extend the working card-and-ledger slice into a controlled business-account flow:

```text
submit business verification
        ↓
Persona approval
        ↓
link one external checking account with Plaid
        ↓
initiate inbound ACH funding through the payment-rail adapter
        ↓
settlement webhook posts the credit to our ledger
        ↓
outbound payment above $1,000 enters maker-checker approval
```

This plan implements the decisions recorded in `decisions.md` as D-021. It does not attempt to complete reconciliation, standing orders, the agent surface, USDC, or the full historical statement experience.

Authentication is deliberately minimal for the trial: Supabase email/password login, persistent cookie sessions, and two seeded demo memberships (`ADMIN` and `MEMBER`). Full user administration is out of scope.

## Locked decisions

- One Persona KYC inquiry is required before transactional activity in the demo.
- Before approval, the user may submit onboarding information and view status only.
- This is an explicit KYC fallback, not a claim of legal-entity KYB; one approved inquiry unlocks the existing business-account gate.
- One linked external checking account is supported per business.
- Plaid links the external bank; it does not move money or become ledger truth.
- Pending ACH credits do not increase available balance.
- Settled ACH credits are new ledger entries.
- ACH returns are new reversal entries; the original credit is never edited.
- The outbound approval threshold is `$1,000.00`.
- The payment initiator cannot approve their own payment.
- Insufficient funds reject before provider submission.
- Agent-created payment requests use the same human approval queue.
- Persona and Lithic are the primary live sandbox integrations. Plaid and Column remain adapter-backed and may be simulated only if sandbox access blocks the core path.

## Provider documentation baseline

Use the providers' documented flows and preserve the adapter boundaries:

- Persona webhooks and inquiry status: [Persona Webhooks](https://docs.withpersona.com/webhooks), [Persona inquiry status](https://docs.withpersona.com/accessing-inquiry-status), and [Persona Hosted Flow API tutorial](https://docs.withpersona.com/tutorial-hosted-flow-unique-api).
- Plaid Link: create a `link_token`, complete Link, exchange the `public_token` through `/item/public_token/exchange`, and persist the resulting `access_token` and `item_id`: [Plaid Link overview](https://plaid.com/docs/link/), [Plaid Link API](https://plaid.com/docs/api/link/).
- Plaid sandbox fallback: use `/sandbox/public_token/create` only for sandbox setup or automated testing: [Plaid Sandbox API](https://plaid.com/docs/api/sandbox/).
- Column ACH: use the ACH transfer API with integer cents and provider transfer identifiers: [Column Create an ACH transfer](https://docs.column.com/api/ach-transfer/create-an-ach-transfer/), [Column API reference](https://docs.column.com/api/).

Do not invent provider endpoints or put provider access tokens in browser code.

## Phase 1 — Persona approval gate

### Implement

- Add internal onboarding records for:
  - business and owner/director details
  - one Persona inquiry/reference
  - verification status
- Add a server-side Persona adapter.
- Add a minimal onboarding screen with:
  - business details
  - owner/director details
  - verification status
  - submit/start verification action
- Add a Persona webhook route with:
  - raw-body signature verification
  - provider event persistence
  - provider event idempotency
  - normalized `PENDING`, `APPROVED`, and `REJECTED` states
- Add a single approval predicate used by all transactional routes.

### Approval invariant

The following must reject while verification is not approved:

- bank linking
- inbound funding creation
- card issuance
- outbound payment creation

The user can still view the onboarding state and retry or inspect a rejected verification according to the demo policy.

### Acceptance checks

- Pending business cannot create a Plaid Link token.
- Rejected business cannot issue a card or create a payment.
- Approved business can proceed to bank linking.
- Replayed Persona webhook produces one state transition.
- An older Persona event cannot move `APPROVED` back to `PENDING`.
- The UI shows pending, approved, rejected, loading, error, and empty states.

### Cut

- Full KYB rules engine.
- Multiple directors and complex ownership graphs.
- Production identity documents.
- Manual compliance review tooling.

## Phase 2 — Plaid bank linking

### Implement

- Add a server route to create a Plaid `link_token` for the approved business.
- Add the web Link client flow.
- Add a server route to exchange the returned `public_token`.
- Persist one linked funding account with:
  - internal business/account ID
  - Plaid item ID
  - Plaid access token, encrypted or protected as a server secret
  - masked institution/account display data
  - status
- Make repeated linking idempotent for the same Plaid Item.
- Show the linked account in the funding screen.

### Acceptance checks

- Pending or rejected businesses cannot start Plaid Link.
- Approved business receives a Link token from the server.
- Public token is never persisted as the long-lived credential.
- Exchange happens server-side only.
- Refreshing the page does not create a second linked account.
- The UI shows linked, linking, error, and empty states.

### Cut

- Multiple external accounts.
- Plaid transaction history.
- Automatic balance polling.
- Production institution edge cases.

## Phase 3 — Column funding adapter

### Implement

- Define a provider-agnostic payment-rail interface for:
  - create inbound transfer
  - retrieve transfer
  - receive transfer event
  - return/recall event
- Add the Column adapter behind that interface.
- Create an internal funding record before provider submission.
- Use integer cents for every request and ledger entry.
- Add a funding screen with:
  - linked bank
  - amount input
  - pending transfer state
  - settled state
  - returned state
- Add a Column webhook route with:
  - signature verification if supported by the configured event mechanism
  - provider-event inbox
  - idempotency
  - delayed settlement handling
- Ledger the lifecycle:

```text
FUNDING_INITIATED
    → FUNDING_PENDING
    → FUNDING_SETTLED: new inbound credit
    → FUNDING_RETURNED: new reversal credit/debit entry
```

- Keep pending credits out of available balance.
- Preserve the original funding journal entry when a return arrives.

### Acceptance checks

- A pending funding transfer does not change available balance.
- Settlement creates exactly one ledger credit.
- Duplicate settlement webhook creates no second credit.
- A return creates a new reversal entry linked to the original funding event.
- The original funding entry is unchanged.
- Provider IDs remain visible for reconciliation later.

### Fallback

If Column sandbox access blocks progress, implement a simulator behind the same payment-rail interface. Label it `simulated` in the README and decision log; do not present it as live.

## Phase 4 — Outbound payment and maker-checker

### Implement

- Add internal payment records with immutable lifecycle events.
- Add payment initiation screen.
- Reject amounts above the available balance before provider submission.
- Apply the `$1,000.00` threshold:
  - below threshold: follow the configured direct path
  - above threshold: create `PENDING_APPROVAL`
- Add approval records containing:
  - initiator
  - approver
  - timestamp
  - decision
  - reason or note
- Enforce that initiator and approver are different humans.
- Add the approval queue screen.
- Add the Column outbound transfer adapter call only after approval.
- Add delayed settlement and return handling using the same provider-event and ledger patterns as funding.

### Acceptance checks

- A payment above `$1,000.00` cannot leave the approval queue without approval.
- The initiator cannot approve their own payment.
- An agent-created payment also enters the queue.
- Insufficient available funds reject before provider submission.
- Duplicate approval requests do not create multiple transfers.
- A payment return produces a new reversal entry.

### Cut

- Batch payments.
- Recurring payments.
- Wires.
- International payments.
- Full beneficiary management.

## Shared schema boundary

Every P1 record must include or resolve to:

- `business_id`
- `account_id`
- internal ID
- provider name
- provider ID/event ID where applicable
- lifecycle status
- created/updated timestamps
- idempotency key where an external side effect exists

Provider balances and provider reports remain external evidence. Customer balances continue to come from our append-only ledger and holds.

## P1 verification sequence

1. Start with an unapproved business and prove all transaction routes reject.
2. Complete Persona sandbox approval and replay the webhook.
3. Link one Plaid sandbox checking account.
4. Create a pending funding transfer.
5. Settle it and verify the ledger credit.
6. Return it and verify a reversal entry.
7. Initiate a `$1,001.00` outbound payment.
8. Prove the initiator cannot approve it.
9. Approve it as a second human.
10. Verify the provider transfer is created once.

## P1 cut list

- Reconciliation breaks screen remains P2.
- Standing orders remain P2.
- Agent read tools and write tool remain P2.
- Stablecoin remains out of P1.
- Full statement as-of querying remains P2.
- Native mobile app remains out of scope.

## Completion bar

P1 is complete when an approved business can link one bank, fund the account through a clearly labelled live or simulated rail, see the settled credit in the ledger, observe a returned funding correction, and send an above-threshold payment through a second-person approval flow.
