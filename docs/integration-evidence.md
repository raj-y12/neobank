# Integration evidence pack

## Current labels

- Lithic card issuing: live sandbox adapter in `src/integrations/lithic/client.ts`; webhook receipt is `app/api/webhooks/lithic/route.ts`.
- Persona KYB/KYC: adapter boundary is present; without `PERSONA_API_KEY`, the UI must display `SIMULATED`.
- Plaid funding link: server-side Link-token boundary is present; without `PLAID_CLIENT_ID`, `PLAID_SECRET`, and `PLAID_TOKEN_ENCRYPTION_KEY`, the UI displays `PLAID SIMULATED`.
- ACH payment rail: Increase adapter in `src/integrations/increase/client.ts`, selected when `INCREASE_API_KEY` and `INCREASE_ACCOUNT_ID` are configured; otherwise deterministic simulator in `src/integrations/simulated-ach.ts` is explicitly `SIMULATED`.
- USDC: deferred by decision; no claim of support.

## Reviewer smoke sequence

1. Apply Supabase migrations and `supabase/seed.sql`.
2. Start the app with `npm run dev`.
3. Open `/onboarding`, `/funding`, `/payments`, `/approvals`, and `/reconciliation`.
4. Use the authenticated business headers documented below for API smoke tests.
5. For live integrations, attach provider dashboard screenshots and webhook delivery IDs here; simulated runs must retain the `SIMULATED` label. Increase also requires `INCREASE_ACCOUNT_ID`, `INCREASE_FUNDING_ACCOUNT_NUMBER`, `INCREASE_FUNDING_ROUTING_NUMBER`, `INCREASE_RECIPIENT_ACCOUNT_NUMBER`, and `INCREASE_RECIPIENT_ROUTING_NUMBER`.

## Demo request headers

The local demo authorization boundary requires `x-business-id`, `x-account-id`, `x-member-id`, and `x-member-role`. Production deployment must replace this demo context with Supabase Auth session resolution before exposing the routes publicly.

## Cut list

USDC/testnet payouts, wires, standing orders, batch payments, native mobile, multiple linked funding accounts, full beneficiary management, and production KYB/KYC evidence are deferred.
