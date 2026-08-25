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

## Current open items

- Enable Supabase leaked-password protection.
- Add forced employee password change and password reset.
- Capture Increase, Plaid, Lithic, Persona, and webhook evidence for the submission pack.
- Extend the card transaction projection for explicit incremental authorizations, multiple captures, expiry, over-capture, and partial capture scenarios.
- Keep USDC, wires, standing orders, batch payments, and native mobile out of this release.
