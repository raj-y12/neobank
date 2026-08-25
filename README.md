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

Run checks with `npm test`, `npm run typecheck`, and `npm run build`. Apply `supabase/migrations/*.sql` followed by `supabase/seed.sql` for the demo data.

See [the integration evidence pack](docs/integration-evidence.md) for the smoke flow, required environment variables, and cut list.

The application is a Next.js web app. Provider credentials belong in local environment variables or Vercel project settings; never commit them.
