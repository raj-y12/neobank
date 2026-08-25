# Slice 1 — Card Lifecycle

Status: scoped, ready to implement

## Goal

Prove the hardest Track 3 behavior on the deployed web app:

```text
$50 authorization → hold → $73.40 clearing → hold release → return/reversal
```

The account will be seeded as already approved and funded. Persona, Plaid, Column ACH, approvals, and standing orders are out of this slice.

## What the user will see

- A business account with a seeded USD balance.
- Ledger balance and available balance.
- One Lithic virtual card.
- Active card hold after authorization.
- Card transaction lifecycle and provider references.
- Settlement for a different amount.
- Linked reversal/return with the original transaction still preserved.

## Stages

### Stage 0 — Provider smoke test

User:

- Confirm the Lithic Sandbox key is active.
- Create or identify a virtual card.
- Confirm the Sandbox can simulate authorization, clearing, and return events.
- Create the Lithic Events API webhook subscription and obtain its webhook secret.

Assistant:

- Add the secret names to `.env.example` only; never commit values.
- Build a temporary health check for Lithic connectivity.
- Record provider event names and payload shapes in the adapter notes.

Database boundary: application services use repository contracts, while the Supabase adapter owns database-specific code. Lithic API and webhook handling can remain Lithic-specific.

Exit condition: we can create a card and trigger at least one Sandbox transaction event.

### Stage 1 — Ledger and hold behavior

Implement and test:

- Seeded business, account, user, and card.
- Repository interfaces for provider events, card transactions, holds, and journal entries.
- Supabase Postgres adapter for those repositories.
- Append-only journal entries.
- Card authorization event.
- Active hold record.
- Derived available balance.
- Duplicate-event protection.

Exit condition:

```text
Before authorization: ledger $1,000.00 / available $1,000.00
After $50 authorization: ledger $1,000.00 / available $950.00
```

### Stage 2 — Clearing and reversal

Implement and test:

- Lithic clearing event for $73.40.
- Release of the original hold exactly once.
- Settlement journal entry for $73.40.
- Reversal intent linked to our internal transaction ID.
- Lithic return event correlated to that intent.
- New immutable reversal journal entry.

Exit condition: the original settlement remains unchanged and the reversal is visibly linked to it.

### Stage 3 — Webhook hardening

Implement:

- Raw-body HMAC verification.
- Five-minute timestamp tolerance.
- Event ID/idempotency checks.
- Safe duplicate delivery.
- Out-of-order event parking.
- Provider event audit record.

The webhook handler will persist through repository interfaces. The Supabase adapter can be replaced without changing card lifecycle rules; the Lithic adapter remains responsible for Lithic-specific behavior.

Exit condition: replaying the same Lithic event produces one economic effect.

### Stage 4 — Deployed demo

Expose only the required surfaces:

- Account overview.
- Holds and available balance.
- Card transaction detail.
- Lifecycle event history.
- Reversal relationship.
- Historical statement view.

Exit condition: the full scenario works on the Vercel deployment, not only locally.

## Decisions for this slice

- Starting balance: $1,000.00.
- Authorization: $50.00.
- Clearing: $73.40.
- Return/reversal: full $73.40.
- Currency: USD cents.
- One seeded business, one user, one virtual card.
- Our IDs are authoritative for internal relationships.
- Lithic IDs are retained as external references.
- A provider return without a reliable original reference is parked unless it matches an explicit reversal intent.
- No ASA enrollment or custom authorization decisioning in this slice unless Lithic Sandbox requires it for the account.

## Not in Slice 1

- Persona onboarding.
- Plaid linking.
- Column ACH.
- Outbound payment approvals.
- Standing orders.
- USDC.
- Mobile-native UI.
- Physical cards.
- Full dispute handling.

## Acceptance checks

- Authorization does not change ledger balance.
- Authorization does reduce available balance.
- Clearing amount may differ from authorization amount.
- Hold releases once and only once.
- Duplicate webhook delivery does not duplicate journal entries.
- Original settlement remains immutable.
- Reversal references the original internal transaction.
- Provider transaction and event IDs are visible for audit.
- The deployed flow works with Sandbox credentials stored outside the repository.
