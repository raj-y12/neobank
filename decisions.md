# Decision Log

This is a timestamped, append-only log of decisions, assumptions, questions, and cuts made during the Track 3 work trial.

## How to use this file

- Add entries as decisions are made; do not rewrite earlier entries.
- Use UTC timestamps in ISO 8601 format.
- Record assumptions when an answer is unavailable instead of waiting.
- Record what changed, why it changed, and the consequence.
- Keep implementation-specific decisions here once they begin.

## Decision status

- `proposed` — under consideration.
- `accepted` — current working decision.
- `superseded` — retained for history but no longer current.
- `rejected` — considered and intentionally not chosen.

## Initial agreed direction

### D-001 — Center the build on the ledger

- Timestamp: 2026-08-25
- Status: accepted
- Decision: Treat the append-only, double-entry, bitemporal ledger as the product core; providers are adapters around it.
- Reason: This directly addresses the track’s hardest grading areas: holds, corrections, statements, and reconciliation.
- Consequence: Provider balances are never treated as our source of truth.

### D-002 — Own three end-to-end use cases

- Timestamp: 2026-08-25
- Status: accepted
- Decision: Prioritize onboarding/funding, card authorization/settlement, and controlled outbound payments.
- Reason: Together they cover the required core loop and the main live-fire scenarios.
- Consequence: Broader neobank functionality remains secondary or cut.

### D-003 — Use USD cents only

- Timestamp: 2026-08-25
- Status: accepted
- Decision: Store and calculate money as integer USD minor units.
- Reason: The brief explicitly requires US dollars and forbids float-based money handling.
- Consequence: Rounding and pro-rata allocation rules must be documented before those calculations are implemented.

### D-004 — Separate value date from booking date

- Timestamp: 2026-08-25
- Status: accepted
- Decision: Every financial event carries both its economic value date and the date the system booked or learned it.
- Reason: This is required for the reversal and bitemporal correction test.
- Consequence: Statements must support both historical economic position and historical knowledge state.

### D-005 — Build narrow UI surfaces

- Timestamp: 2026-08-25
- Status: accepted
- Decision: Build the account dashboard, card detail, approval queue, reconciliation breaks, and historical statement views first.
- Reason: These surfaces expose the behaviors the reviewer will attack.
- Consequence: Native mobile breadth, advanced analytics, and broad administration are cut from the core path.

### D-006 — Use Column for payment rails and reconciliation

- Timestamp: 2026-08-25
- Status: accepted
- Decision: Use Column's sandbox as the payment-rail integration for ACH credits/debits, delayed settlement, returns, reversals, webhooks, and settlement-report reconciliation. Keep an internal simulator only as a fallback for scenarios Column cannot conveniently trigger.
- Positive: Column gives us a realistic ACH-shaped sandbox with stateful transfers, simulated settlement and return behavior, webhook events, idempotency support, and settlement reports. This is stronger evidence than presenting an entirely internal payment simulator.
- Trade-off: Column introduces its own entity, bank-account, transfer, event, and reporting model that must be normalized into our domain. Its provider balance and reports remain external truth for reconciliation, not our product ledger.
- Consequence: The outbound-payment flow will be built behind a payment-rail adapter so Column can be live without coupling the rest of the system to Column's schema.
- Evidence: Column sandbox, ACH, webhook, idempotency, and reporting documentation reviewed before this decision.

### D-007 — Use Lithic for card issuing

- Timestamp: 2026-08-25
- Status: accepted
- Decision: Use Lithic's sandbox as the initial card-issuing provider for card creation, authorization, capture/settlement, and reversal behavior. A Lithic account has been set up. Stripe Issuing remains the fallback if Lithic cannot support the required trial flow quickly enough.
- Positive: This keeps the card path focused on the Track 3 centerpiece: authorization holds, different-amount settlement, delayed events, and reversals.
- Trade-off: We must learn and normalize Lithic's event model, verify its webhook behavior, and ensure the exact authorization/capture scenario is available in the sandbox before depending on it.
- Consequence: The card adapter must isolate Lithic-specific identifiers, statuses, and webhook payloads from the ledger and card-transaction model.
- Evidence: Lithic sandbox account established; exact scenario support to be verified during provider smoke testing.

### D-008 — Use Plaid for external-bank linking

- Timestamp: 2026-08-25
- Status: accepted
- Decision: Use Plaid Sandbox as the initial external-bank-linking provider for connecting a business's funding account. A Plaid account has been set up. If linking setup becomes a time risk, retain the same adapter boundary and use a clearly labelled funding simulator.
- Positive: Plaid gives the onboarding and funding flow a recognizable external-bank-linking surface without building bank aggregation ourselves.
- Trade-off: Plaid linking and the actual movement of funds are separate concerns; Plaid should not be treated as the ACH settlement provider or as the ledger source of truth.
- Consequence: Plaid will produce a linked funding source, while Column or the payment-rail adapter will represent the actual inbound ACH movement and resulting ledger event.
- Evidence: Plaid Sandbox account established; exact funding flow to be verified during provider smoke testing.

### D-009 — Model reversals as linked immutable transactions

- Timestamp: 2026-08-25
- Status: accepted
- Decision: A reversal is always a new immutable transaction with its own journal entry, linked explicitly to the original payment or settlement through `reverses_payment_id` and `reverses_journal_entry_id`. The original financial record is never edited or deleted.
- Positive: The transaction history clearly explains what happened, statements can show both the original settlement and its reversal, and the correction remains auditable.
- Trade-off: The UI and queries must combine the original transaction with its lifecycle events to display the current state. A simple mutable status column is not sufficient as the source of truth.
- Lifecycle: Authorization received → capture received → settled → reversal received. The displayed status is derived from the append-only lifecycle history.
- Consequence: A reversal can be idempotently replayed, partial reversals can be represented, and multiple captures can each be reversed precisely. A reversal references the specific capture or settlement it corrects, not only the broader authorization.

### D-010 — Use Persona for KYB/KYC

- Timestamp: 2026-08-25
- Status: accepted
- Decision: Use Persona Sandbox as the initial KYB/KYC provider for business onboarding, owner checks, pending/approved/declined outcomes, and signed status webhooks. A Persona sandbox account has been set up using an authorized Aethria company email.
- Positive: Persona provides a direct sandbox API and webhook flow that maps cleanly to the account activation gate, while allowing mocked verification outcomes without real identity documents.
- Trade-off: Persona requires sandbox configuration such as transaction types/templates and may require eligibility review before all features are available. The integration must remain behind an adapter in case configuration or access becomes a blocker.
- Consequence: An account cannot activate or transact until our system receives an approved Persona outcome. Persona identifiers and statuses will be normalized into our own onboarding model.
- Safety: Use sandbox credentials and mocked test data only; never submit real identity documents or production keys.
- Evidence: Persona sandbox account established; configuration and webhook smoke test still pending.

### D-011 — Build a web app and deploy on Vercel

- Timestamp: 2026-08-25
- Status: accepted
- Decision: Build Track 3 as a browser-based web application using Next.js and deploy it on Vercel from the beginning.
- Positive: This gives us the required public URL early, supports server-side webhook endpoints, and keeps the demo, account views, approval queue, statements, and reconciliation screens in one deployable application.
- Trade-off: The application must be designed around Vercel's deployment and environment-variable model, and long-running/background work will need a suitable scheduled or event-driven approach rather than an always-on server process.
- Consequence: Local development and preview deployments will use the same route boundaries and environment configuration as production. Secrets will remain in Vercel environment variables and `.env.example`, never in the repository.

### D-012 — Own internal transaction identity and reversal relationships

- Timestamp: 2026-08-25
- Status: accepted
- Decision: Our system will generate and own internal transaction IDs, ledger-entry IDs, and reversal relationships. Lithic provider transaction tokens and event IDs will be stored as external references. Column will not participate in the card lifecycle; it remains the ACH/payment-rail provider for later slices.
- Positive: The product can maintain a stable transaction history even when a provider return or reversal arrives as a standalone event without a reliable original-transaction reference.
- Trade-off: A provider return does not automatically prove which original transaction it reverses. For reversals initiated by our app, we will create a reversal intent linked to our original transaction before invoking the provider, then correlate the resulting provider event to that intent.
- Consequence: The card detail view will show both our internal relationship and the underlying Lithic references. Unexpected or ambiguous provider returns will be parked for review rather than auto-linked incorrectly.

### D-013 — Keep the database provider-agnostic

- Timestamp: 2026-08-25
- Status: accepted
- Decision: Use Supabase Postgres for durable webhook receipts, ledger state, holds, card transactions, and event history. Access will be isolated behind application-owned repository interfaces so the database can be replaced later without changing domain logic.
- Positive: Supabase gives the Vercel deployment durable relational storage while keeping the ledger and webhook state consistent across instances and restarts.
- Trade-off: We must define repository interfaces and migrations, and we will carry a small database adapter layer. Switching databases later will require a new adapter rather than domain changes.
- Consequence: Supabase will persist our application model, not replace it with provider-specific tables or balances. Lithic, Persona, Plaid, and Column integrations may remain provider-specific where that makes their APIs clearer.
- Boundary: `domain` and application services depend on repository contracts; `adapters/supabase` implements those contracts. Provider integrations remain separate from the database choice.

### D-014 — Own transaction linkage before presenting related activity

- Timestamp: 2026-08-25
- Status: accepted
- Decision: The application will create immutable internal card-transaction records and own the relationship between an authorization, captures/settlements, and reversals. Lithic transaction tokens and event IDs are external references only.
- Positive: A transaction detail view can show the real lifecycle and link a reversal to the exact settlement it corrects, even when Lithic emits a standalone return.
- Trade-off: We need a transaction projection and explicit reversal-intent flow before the UI can claim that two provider records are related. Same-card or same-merchant matching is not sufficient.
- Consequence: The modal will eventually read related transactions through our internal `reverses_transaction_id` relationship. Ambiguous provider returns remain unlinked and visible for review until a human or explicit intent resolves them.

### D-015 — Derive available balance from settled ledger and active holds

- Timestamp: 2026-08-25
- Status: accepted
- Decision: Available balance is derived as settled ledger balance minus active card holds. Pending inbound credits do not increase available balance until they settle.
- Positive: The customer-facing balance is provable from immutable entries and hold records, and authorization does not incorrectly change the settled ledger balance.
- Trade-off: The system must maintain accurate hold lifecycle state and calculate the balance from events rather than storing a separately editable available-balance number.

### D-016 — Link provider returns through an internal reversal intent

- Timestamp: 2026-08-25
- Status: accepted
- Decision: When our system initiates a reversal, it first creates an internal reversal intent containing `original_transaction_id`, expected amount, card, and an idempotency key. After Lithic creates the return, we store the returned Lithic transaction token against that intent. The resulting webhook is then projected into a new immutable internal reversal transaction linked to the original.
- Positive: The linkage remains ours even though Lithic creates the return as a separate provider transaction with no shared original-transaction ID.
- Trade-off: A manually-created or externally-created Lithic return cannot be safely auto-linked. It must be parked as `UNMATCHED_RETURN` or explicitly matched by an authorized operator.
- Consequence: The UI and ledger use our internal `reverses_transaction_id`; Lithic tokens and event IDs remain audit references. Out-of-order delivery is handled by storing the provider token and resolving the pending intent when the webhook arrives.

### D-017 — Customer funds remain owned by the team while holds reduce availability

- Timestamp: 2026-08-25
- Status: accepted
- Decision: The business team owns the funds economically. A card authorization does not reduce the total customer ledger balance; it reserves money by moving it from the team's available-funds bucket into its card-holds bucket.
- Positive: Ledger balance remains a complete view of the team's money, while available balance accurately reflects what can be spent immediately.
- Trade-off: Available balance must be derived from settled postings and active holds. It must not be stored as an independently editable balance.
- Consequence: A `$1,000` ledger balance with a `$50` active hold has `$950` available. Clearing releases the hold and posts the final settled amount; expiry or authorization reversal releases the hold without posting a settlement.

### D-018 — Expose reversal linking in the transaction modal

- Timestamp: 2026-08-25T14:04:50Z
- Status: accepted
- Decision: Provide an explicit `Link return` action from the card transaction modal. The operator selects the original settled transaction, enters the standalone Lithic return token, and our server validates the card and expected amount before creating the internal reversal relationship.
- Context: Lithic can emit a standalone return without a shared original-transaction ID. Same-card, same-merchant, or same-amount matching is not sufficient evidence of a correction.
- Positive: The live-fire demo can show the operator-owned relationship clearly, while keeping the browser flow aligned with the internal transaction model.
- Trade-off: A manually created Lithic return requires an explicit operator action before it can affect the ledger. Unmatched returns remain visible as `UNMATCHED_RETURN` and do not change balances.
- Consequence: The modal becomes the controlled entry point for reversal intents and links. The webhook remains responsible for projecting the provider return and posting the immutable reversal journal entry exactly once.

## Open decisions

The following are intentionally unresolved and should be decided with evidence during implementation:

- Whether USDC is live testnet or simulated.
- Exact chart-of-accounts structure.
- Exact hold-accounting entries for authorization, capture, expiry, and reversal.
- Treatment of uncleared inbound credits in available balance.
- Standing-order insufficient-funds policy.
- Reconciliation file format and break-resolution workflow.

## Entry template

### D-XXX — Short decision title

- Timestamp: YYYY-MM-DDTHH:MM:SSZ
- Status: proposed | accepted | superseded | rejected
- Decision:
- Context:
- Options considered:
- Reason:
- Consequence:
- Evidence or links:
