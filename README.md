# Track 3 — Neobank

The current web shell is deployed on Vercel:

https://neobank-blush.vercel.app

## What works

The product is centered on an append-only USD-cents ledger. The demo surfaces onboarding, linked funding, inbound ACH settlement/return modeling, derived ledger versus available balance, outbound payment approval, agent queue submission, card lifecycle projection, and reconciliation breaks.

Provider status is intentionally visible: Lithic is the live-sandbox card boundary; Persona, Plaid, and Increase ACH use live adapters when credentials are configured and otherwise show `SIMULATED`. USDC is deferred.

Persona currently provides the available live KYC inquiry flow. Full business/director KYB is provider-gated in the available Persona setup, so it is documented as a constraint rather than represented as an implemented capability.

Open `/statements` for the authenticated account-level statement. Use the one-day date or inclusive `From`/`To` controls to review opening/closing ledger and available balances, holds separately, running activity, and current corrected versus historical `known at` views for later journal corrections.

Admins can open `/standing-orders` to create, pause, resume, or cancel recurring ACH payments. Schedules use the same account/routing validation as Send Money; bank details are encrypted at rest, masked in the UI, and decrypted only immediately before the payment rail call. Each schedule shows its next run and occurrence history; payments generated above the approval threshold are labeled as standing orders and enter the normal second-human approval queue.

## Local development

```bash
npm install
npm run dev
```

Run checks with `npm test`, `npm run typecheck`, and `npm run build`. Apply `supabase/migrations/*.sql` followed by `supabase/seed.sql` for the demo data. The seed includes the approved business, onboarding verification, encrypted simulated Plaid account, settled inbound funding, pending maker-checker payment, assigned simulated card, and opening/funding ledger entries. It does not create Auth users: create the owner through `/login`, then use the admin Team flow to provision employees.

See [the integration evidence pack](docs/integration-evidence.md) for the smoke flow, required environment variables, and cut list.
Scheduled recovery and standing-order execution run through an external cron provider; see [the external cron setup](docs/external-crons.md).

The public v1 API is documented in [docs/public-api.md](docs/public-api.md), with interactive Scalar docs at `/docs` and the OpenAPI contract at `/api/v1/openapi.json`.

For current behavior and provider choices, use this README, [decisions.md](decisions.md), and the [integration evidence pack](docs/integration-evidence.md). Historical implementation plans are not operational documentation.

The application is a Next.js web app. Provider credentials belong in local environment variables or Vercel project settings; never commit them.

## Production-readiness notes

- Increase is the ACH rail when its account and counterparty configuration are present; otherwise the UI must label the deterministic simulator.
- Plaid access tokens and account/routing values are encrypted at rest with `PLAID_TOKEN_ENCRYPTION_KEY`.
- Provider webhooks must be configured in Increase, Lithic, Persona, and Plaid environments and verified with the evidence checklist.
- A Lithic return is a new provider transaction and must be explicitly linked to its original settlement before the reversal is posted. The reversal keeps the settlement value date and the later booking/knowledge timestamp for `Known at` statements.
- Enable Supabase Auth leaked-password protection in Authentication → Password Security before production handoff.
- Agent routes (`app/api/agent/*`) were implemented in an earlier pass and were not touched by this remediation; see [`docs/track-3-plan.md`](docs/track-3-plan.md).

## Local demo audit log

- 2026-08-26 13:40 UTC — Created `codex-admin-20260826@example.com` through the authenticated Employees flow with the `ADMIN` role. The one-time initial password was used for this session only and is not recorded here.
- 2026-08-26 13:40 UTC — Signed in as the new admin and opened the approval queue. The existing Northstar Supplies ACH payment (`4721bade-49ae-45cc-a751-99e4c7ee06a5`) was the only pending approval, for `$1,240.00`.
- 2026-08-26 13:40 UTC — The UI rejection action inserted the `REJECTED` approval audit row, then returned `Unable to reject payment` because the deployed `release_payment_funds` RPC exposed a parameter/signature mismatch (`PGRST202`).
- 2026-08-26 13:41 UTC — Completed the explicitly authorized rejection on the same payment record, setting its status to `REJECTED`. Reloading `/approvals` verified `0 payment(s) awaiting approval`.
- 2026-08-26 13:54 UTC — Applied `fix_release_payment_funds_rpc` to restore the missing deployed RPC, then posted the idempotent `PAYMENT_RESERVATION_RELEASE` journal entry (`169de46d-92c7-4650-b216-3cf452e6a2b5`) for the rejected payment. This releases the `$1,240.00` hold back to `CUSTOMER_AVAILABLE`.
