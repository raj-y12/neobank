# Integration evidence pack

## Current labels

- Lithic card issuing: live sandbox adapter in `src/integrations/lithic/client.ts`; webhook receipt is `app/api/webhooks/lithic/route.ts`.
- Persona KYC: the available live Persona inquiry flow is supported; without `PERSONA_API_KEY`, the UI must display `SIMULATED`.
- KYB limitation (decision): full legal-entity and director KYB is provider-gated by the available Persona setup. This is an honest, defensible provider constraint—not an implementation failure—and no evidence claim should imply that full KYB is live.
- Plaid funding link: server-side Link-token boundary is present; without `PLAID_CLIENT_ID`, `PLAID_SECRET`, and `PLAID_TOKEN_ENCRYPTION_KEY`, the UI displays `PLAID SIMULATED`.
- ACH payment rail: Increase adapter in `src/integrations/increase/client.ts`. Live movement requires `PAYMENT_RAIL_MODE=LIVE`, the Increase credentials, and an active provider-account record for the authenticated business and ledger account. Everything else stays explicitly `SIMULATED`.
- USDC: deferred by decision; no claim of support.

## Verification status (2026-08-26)

- Increase: the sandbox adapter is configured in the deployed project. Add Money sends the positive integer-cent amount to `/ach_transfers`; in this sandbox flow that debits the configured Increase account. Settlement or return then updates the product ledger through the lifecycle event. Retain the Increase transfer ID and webhook delivery ID for each rehearsal.
- Plaid: sandbox Link and token exchange are available when the three Plaid variables are configured. Existing linked-account tokens were migrated to the application AES-256-GCM representation; no token is returned to the browser.
- Lithic: sandbox card inventory and webhook adapter are live. Use the admin “Sync existing cards” action to associate cards with the business before delegating them.
- Supabase: application RLS gaps were closed in migration `20260825220000_harden_application_rls`; the security advisor should show only the dashboard-controlled leaked-password warning until that setting is enabled.
- Auth: employee provisioning is direct and intentionally returns the initial password once because email delivery is not configured. A forced password-change/reset flow remains a production handoff item.

## Reviewer smoke sequence

1. Apply Supabase migrations and `supabase/seed.sql`.
2. Start the app with `npm run dev`.
3. Open `/onboarding`, `/funding`, `/payments`, `/approvals`, and `/reconciliation`.
4. Open `/statements` to review the authenticated account-level statement. Select a date or an inclusive `From`/`To` range and, when testing corrections, use the `Known at` control to compare the current corrected view with the historical journal snapshot.
5. Sign in with a Supabase Auth user that has a matching business membership. Protected pages redirect incomplete or signed-out sessions to `/login`.
6. For live integrations, attach provider dashboard screenshots and webhook delivery IDs here; simulated runs must retain the `SIMULATED` label. Increase requires `PAYMENT_RAIL_MODE=LIVE`, `INCREASE_API_KEY`, `INCREASE_ACCOUNT_ID`, and an active business/account-scoped `provider_accounts` row. Linked funding details come from the encrypted linked-account record, not global account-number environment variables.

## Evidence to attach before submission

- Increase: account page, an Add Money ACH transfer showing the Increase debit, and webhook/event delivery for settlement or return. Include one outbound payment transfer as separate evidence.
- Plaid: Link success, `/api/funding/exchange` response without secrets, and the linked-account row showing encrypted storage.
- Lithic: card inventory page after sync, delegation page, and one authorization/settlement webhook event.
- Supabase: security advisor result after leaked-password protection is enabled, plus the migration list showing the RLS hardening migration.

## Authentication evidence

The application uses Supabase Auth sessions. Server routes resolve `business_id`, `account_id`, member ID, and role from the authenticated membership; they do not trust client-supplied business or role headers. Evidence should show an admin session, a member session, and a signed-out protected-page redirect to `/login`.

## Cut list

USDC/testnet payouts, wires, batch payments, native mobile, multiple linked funding accounts, full beneficiary management, and full business/director KYB are deferred. The KYB item is provider-gated; the available live Persona KYC flow is implemented and must not be described as full KYB.
