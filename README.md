# Track 3 — Neobank

The current web shell is deployed on Vercel:

https://neobank-blush.vercel.app

## What works

The product is centered on an append-only USD-cents ledger. The demo surfaces onboarding, linked funding, inbound ACH settlement/return modeling, derived ledger versus available balance, outbound payment approval, agent queue submission, card lifecycle projection, and reconciliation breaks.

Provider status is intentionally visible: Lithic is the live-sandbox card boundary; Persona, Plaid, and Increase ACH use live adapters when credentials are configured and otherwise show `SIMULATED`. USDC is deferred.

## Local development

```bash
npm install
npm run dev
```

Run checks with `npm test`, `npm run typecheck`, and `npm run build`. Apply `supabase/migrations/*.sql` followed by `supabase/seed.sql` for the demo data. The seed includes the approved business, onboarding verification, encrypted simulated Plaid account, settled inbound funding, pending maker-checker payment, assigned simulated card, and opening/funding ledger entries. It does not create Auth users: create the owner through `/login`, then use the admin Team flow to provision employees.

See [the integration evidence pack](docs/integration-evidence.md) for the smoke flow, required environment variables, and cut list.
Scheduled recovery and standing-order execution run through an external cron provider; see [the external cron setup](docs/external-crons.md).

The application is a Next.js web app. Provider credentials belong in local environment variables or Vercel project settings; never commit them.

## Production-readiness notes

- Increase is the ACH rail when its account and counterparty configuration are present; otherwise the UI must label the deterministic simulator.
- Plaid access tokens and account/routing values are encrypted at rest with `PLAID_TOKEN_ENCRYPTION_KEY`.
- Provider webhooks must be configured in Increase, Lithic, Persona, and Plaid environments and verified with the evidence checklist.
- Enable Supabase Auth leaked-password protection in Authentication → Password Security before production handoff.
- Agent routes are intentionally excluded from this remediation release; see [`docs/track-3-plan.md`](docs/track-3-plan.md).
