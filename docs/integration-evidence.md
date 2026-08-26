# Integration evidence pack

## Current labels

- Lithic card issuing: live sandbox adapter in `src/integrations/lithic/client.ts`; webhook receipt is `app/api/webhooks/lithic/route.ts`.
- Persona KYC: the available live Persona inquiry flow is supported; without `PERSONA_API_KEY`, the UI must display `SIMULATED`.
- KYB limitation (decision): full legal-entity and director KYB is provider-gated by the available Persona setup. This is an honest, defensible provider constraint—not an implementation failure—and no evidence claim should imply that full KYB is live.
- Plaid funding link: server-side Link-token boundary is present; without `PLAID_CLIENT_ID`, `PLAID_SECRET`, and `PLAID_TOKEN_ENCRYPTION_KEY`, the UI displays `PLAID SIMULATED`.
- ACH payment rail: Increase adapter in `src/integrations/increase/client.ts`, selected when `INCREASE_API_KEY` and `INCREASE_ACCOUNT_ID` are configured; otherwise deterministic simulator in `src/integrations/simulated-ach.ts` is explicitly `SIMULATED`.
- USDC: deferred by decision; no claim of support.

## Verification status (2026-08-25)

- Increase: sandbox adapter is configured in the deployed project; Add Money uses a negative ACH amount so funds are pulled from the linked bank. Retain the Increase transfer ID and webhook delivery ID for each settlement/return rehearsal.
- Plaid: sandbox Link and token exchange are available when the three Plaid variables are configured. Existing linked-account tokens were migrated to the application AES-256-GCM representation; no token is returned to the browser.
- Lithic: sandbox card inventory and webhook adapter are live. Use the admin “Sync existing cards” action to associate cards with the business before delegating them.
- Supabase: application RLS gaps were closed in migration `20260825220000_harden_application_rls`; the security advisor should show only the dashboard-controlled leaked-password warning until that setting is enabled.
- Auth: employee provisioning is direct and intentionally returns the initial password once because email delivery is not configured. A forced password-change/reset flow remains a production handoff item.

## Reviewer smoke sequence

1. Apply Supabase migrations and `supabase/seed.sql`.
2. Start the app with `npm run dev`.
3. Open `/onboarding`, `/funding`, `/payments`, `/approvals`, and `/reconciliation`.
4. Open `/statements` to review the authenticated account-level statement. Select a date or an inclusive `From`/`To` range and, when testing corrections, use the `Known at` control to compare the current corrected view with the historical journal snapshot.
5. Use the authenticated business headers documented below for API smoke tests.
6. For live integrations, attach provider dashboard screenshots and webhook delivery IDs here; simulated runs must retain the `SIMULATED` label. Increase also requires `INCREASE_ACCOUNT_ID`, `INCREASE_FUNDING_ACCOUNT_NUMBER`, `INCREASE_FUNDING_ROUTING_NUMBER`, `INCREASE_RECIPIENT_ACCOUNT_NUMBER`, and `INCREASE_RECIPIENT_ROUTING_NUMBER`.

## Evidence to attach before submission

- Increase: account page, ACH transfer detail, and webhook/event delivery for one inbound settlement and one outbound settlement/return.
- Plaid: Link success, `/api/funding/exchange` response without secrets, and the linked-account row showing encrypted storage.
- Lithic: card inventory page after sync, delegation page, and one authorization/settlement webhook event.
- Supabase: security advisor result after leaked-password protection is enabled, plus the migration list showing the RLS hardening migration.

## Demo request headers

The local demo authorization boundary requires `x-business-id`, `x-account-id`, `x-member-id`, and `x-member-role`. Production deployment must replace this demo context with Supabase Auth session resolution before exposing the routes publicly.

## Cut list

USDC/testnet payouts, wires, standing orders, batch payments, native mobile, multiple linked funding accounts, full beneficiary management, full business/director KYB (provider-gated), and production KYB/KYC evidence are deferred.
