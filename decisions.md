# Decision Log

This is the decision record for the Track 3 trial. It records the choices we made, why we made them, and what we intentionally left out.

## Product direction

### D-001 — Make the ledger the source of truth

- Date: 2026-08-25
- Decision: Use an append-only, double-entry USD-cents ledger as the core of the product. Providers are adapters around it.
- Why: Balances, holds, settlements, reversals, statements, and reconciliation need to be explainable from our own history.
- Result: Provider balances never replace the product ledger.

### D-002 — Focus the trial on three flows

- Date: 2026-08-25
- Decision: Prioritize onboarding and funding, card authorization and settlement, and controlled outbound payments.
- Why: These are the flows the reviewer is most likely to test end to end.
- Cut: Mobile apps, advanced analytics, broad administration, and USDC are outside this trial.

### D-003 — Store money as integer cents

- Date: 2026-08-25
- Decision: Store and calculate USD as integer cents, never floating-point dollars.
- Why: It avoids rounding errors and matches the requirements.

### D-004 — Keep value date and booking date separate

- Date: 2026-08-25
- Decision: Every financial event has an economic value date and a booking date.
- Why: A delayed provider event must not rewrite the historical record.

## Providers and integrations

### D-005 — Use Increase for ACH

- Date: 2026-08-25
- Decision: Use Increase for inbound funding and outbound ACH. Keep the simulator only as an explicitly labelled fallback.
- Why: I have an Increase sandbox account and it gives us one provider boundary for transfers, settlement, returns, webhooks, and exports.
- Note: The earlier Column decision is superseded. Increase account, counterparty, and webhook configuration are still required for a genuinely live run.

### D-006 — Use Plaid only to link the external bank

- Date: 2026-08-25
- Decision: Plaid identifies and links the external funding account; it does not move money and is not ledger truth.
- Why: Bank linking and ACH movement are separate responsibilities.

### D-007 — Use Lithic for cards

- Date: 2026-08-25
- Decision: Use Lithic sandbox for card issuing and card provider events.
- Why: It gives us a realistic card boundary for authorization, settlement, holds, and reversals.

### D-008 — Use Persona for the onboarding check

- Date: 2026-08-25
- Decision: Use one Persona sandbox inquiry for the demo onboarding gate.
- Why: The available Persona setup supports a clear verification step without pretending that the demo is full legal-entity KYB.
- Result: The product labels the flow honestly as Persona KYC/onboarding verification.

## Authentication and access

### D-009 — Use Supabase Auth and business memberships

- Date: 2026-08-25
- Decision: Use Supabase email/password Auth. Each user is mapped to one business membership with an `ADMIN` or `MEMBER` role for this trial.
- Why: It gives us real sessions and two testable roles without hardcoding the active business.
- Cut: Multi-business switching, MFA, and full invitation infrastructure are out of scope for this release.

### D-010 — Provision employees directly for now

- Date: 2026-08-25
- Decision: An authorized admin can create an employee login with an initial password and share it through a secure channel because email delivery is not configured.
- Why: We need a usable employee/card-delegation flow without inventing an email system for the trial.
- Requirement before production: Add forced password change and password reset. Never persist or log the initial password.

### D-011 — Enforce roles at the server boundary

- Date: 2026-08-25
- Decision: `ADMIN` and `MEMBER` permissions are checked on the server. Business and account scope comes from the authenticated membership, not client-provided headers.
- Why: UI hiding is not authorization, and service-role access must not become a tenant boundary.

## Scope and delivery

### D-012 — Keep the UI focused on reviewer-critical behavior

- Date: 2026-08-25
- Decision: Keep the existing UI shape while wiring real funding, payments, approvals, cards, reconciliation, and status/error states.
- Why: The separate design work owns visual refinement; this implementation is limited by correctness and evidence.

### D-013 — Defer the agent surface

- Date: 2026-08-25
- Decision: Leave the agent tools out of this remediation pass.
- Why: Payment rail correctness, inbound settlement, maker-checker, reconciliation, card access, and security are more important to the reviewer path.

### D-014 — Commit in small slices

- Date: 2026-08-25
- Decision: Implement and push one verified phase at a time.
- Why: Small commits make provider and authorization regressions easier to isolate.

### D-015 — Seed simulated data honestly

- Date: 2026-08-25
- Decision: The seed includes clearly simulated funding, payment, card, and ledger rows. Live provider evidence must come from provider dashboards and webhook delivery records.
- Why: A reviewer should be able to run the demo without mistaking seed data for live integration proof.

### D-016 — Promote unmatched card clearings after a fixed grace period

- Date: 2026-08-26
- Decision: Identify Lithic lifecycle events by their event token, not webhook delivery ID. A clearing without an authorization is parked for 15 minutes from first receipt; on deterministic replay after that boundary it is treated as a zero-hold force-post.
- Why: The transaction webhook does not provide a reliable force-post discriminator. Immediate posting would misclassify ordinary out-of-order delivery, while indefinite parking would omit real financial activity. The fixed grace makes retries and review behavior reproducible.
- Operational gap: Promotion currently occurs on webhook replay or recovery processing; a scheduled recovery worker is still required before production.

### D-017 — Allocate card returns to immutable captures oldest-first

- Date: 2026-08-26
- Decision: Every clearing receives an event-specific journal reference and value date. A return is allocated oldest-first across the original transaction's still-reversible clearing entries, producing one immutable correction per capture.
- Why: A transaction can have multiple captures on different dates. A single mutable transaction value date cannot reproduce corrected history or prevent a retry from reversing a different capture.

## Current open items

- Enable Supabase leaked-password protection.
- Add forced employee password change and password reset.
- Capture Increase, Plaid, Lithic, Persona, and webhook evidence for the submission pack.
- Add a scheduled recovery worker to replay parked card clearings after the 15-minute force-post grace.
- Keep USDC, wires, batch payments, and native mobile out of this release. Standing-order persistence is now specified, but its authenticated API and scheduler remain follow-up work.

### D-018 — Make standing-order occurrences idempotent before scheduling

- Date: 2026-08-26
- Decision: A standing-order occurrence is keyed by `standing_order_id:scheduled_date`; insufficient funds are recorded as an explicit skipped outcome, with retry policy stored on the order.
- Why: A scheduler may retry after a timeout or run on more than one instance. The unique occurrence key prevents duplicate payments, while an explicit outcome preserves an auditable decision instead of silently dropping a run.

### D-019 — Collect ACH beneficiary details and convert dollars at the API boundary

- Date: 2026-08-26
- Decision: The send-money form collects recipient name, account number, routing number, and a dollar amount. The API validates the banking identifiers and converts the dollar string to integer cents before creating the payment or calling the rail.
- Why: Users think in dollars, while ledger and provider amounts must be exact integer cents. Keeping conversion server-side prevents client rounding or unit mismatches; storing beneficiary details with the payment keeps retries deterministic.

### D-020 — Require explicit live-rail opt-in

- Date: 2026-08-26
- Decision: Increase credentials never select the live payment rail by themselves. Live money movement requires `PAYMENT_RAIL_MODE=LIVE`; all local and demo environments default to `SIMULATED`.
- Why: Provider account balances and the product ledger are separate boundaries. Accidental credential discovery must not turn a UI test into a real transfer.
