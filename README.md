# Corgi — Track 3 Neobank

Corgi is a USD business banking prototype built around an append-only cents ledger, provider-backed integrations, and explicit human approval for higher-risk money movement.

Live demo: [neobank-blush.vercel.app](https://neobank-blush.vercel.app)

## Product surfaces

| Surface | URL | Purpose |
| --- | --- | --- |
| Web app | `/` | Onboarding, balances, funding, payments, cards, statements, approvals, team, and standing orders |
| Scalar API docs | `/docs` | Interactive reference for the public REST API |
| OpenAPI contract | `/api/v1/openapi.json` | Machine-readable REST API definition |
| Public REST API | `/api/v1/*` | Authenticated account, payment, card, and reconciliation operations |
| MCP server | `/api/mcp` | Streamable HTTP tools for an AI agent |

## What is implemented

- Persona onboarding and available KYC inquiry flow.
- Plaid-linked funding accounts, encrypted sensitive bank data, and simulated/live provider labeling.
- Increase ACH adapters with deterministic simulation fallback.
- Append-only USD-cents ledger with ledger balance, available balance, holds, and statements.
- Maker-checker payment approval queue and rejection/release handling.
- Lithic card lifecycle projection, card assignment, spend limits, and secure in-app card-detail reveal.
- Recurring ACH standing orders with occurrence history and approval-threshold handling.
- Public REST API documented with Scalar and OpenAPI.
- MCP tools for account summaries, safe card metadata, payment status/creation, and reconciliation breaks.

The following are intentionally deferred or provider-gated: USDC, wires, batch payments, multiple funding sources, native mobile, full beneficiary management, and full business/director KYB.

## Quick start

Requirements: Node.js 20 or newer and a Supabase project.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Copy the required values into `.env.local`; provider secrets belong only in local environment variables or Vercel project settings.

### Database and demo data

Apply the SQL files in this order:

1. `supabase/migrations/*.sql`
2. `supabase/seed.sql`

The seed creates the `demo-business` / `demo-account` fixture, approved onboarding data, a simulated Plaid account, settled inbound funding, a pending payment, an assigned simulated card, and opening ledger entries. It does not create Supabase Auth users.

After setting the Supabase service-role key and demo credentials in `.env.local`, create the demo users with:

```bash
node scripts/seed-demo-auth.mjs
```

The script is safe to re-run: it reuses existing users and upserts their business memberships.

## Test accounts

The deployed demo currently has these test accounts. They are demo-only credentials and must be rotated or removed before production use. Never reuse them for real financial data.

| Role | Email | Password |
| --- | --- | --- |
| `ADMIN` | `admin@corgi-demo.test` | `CorgiDemoAdmin2026!` |
| `MEMBER` | `member@corgi-demo.test` | `CorgiDemoMember2026!` |

Do not commit production passwords, service-role keys, Lithic secrets, or provider tokens to Git. The checked-in `.env.example` contains placeholders only.

Set these local-only variables before running `scripts/seed-demo-auth.mjs`:

```dotenv
DEMO_ADMIN_EMAIL=admin@corgi-demo.test
DEMO_ADMIN_PASSWORD=CorgiDemoAdmin2026!
DEMO_MEMBER_EMAIL=member@corgi-demo.test
DEMO_MEMBER_PASSWORD=CorgiDemoMember2026!
```

The generated users are:

- `ADMIN`: can view account-level data, manage team members, issue/sync/delegate cards, approve or reject payments, and inspect reconciliation breaks.
- `MEMBER`: can view their permitted account/card data, initiate payments, and use their assigned card. They cannot approve their own payment or access admin-only account/reconciliation tools.

If you need to reproduce the previously audited deployed session, use a fresh account or obtain the one-time password through the project’s secure channel; that password was intentionally not recorded in this repository.

## Reviewer smoke test

1. Apply migrations and seed data, then create the local admin/member users.
2. Sign in as `ADMIN` and verify the account, funding, ledger, statements, team, cards, approval queue, and reconciliation views.
3. Sign in as `MEMBER` and verify member-scoped card/payment access and the absence of admin actions.
4. On a card detail page, select **View card details**. The card flips in place and mounts Lithic’s secure PAN, expiry, and CVV fields into the existing card styling. Values are never stored by this app.
5. Create a payment as a member, then approve or reject it as an admin. Confirm the hold and ledger behavior.
6. Sign out and confirm protected pages redirect to `/login`.

Run the automated checks before handoff:

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

## Public REST API

The REST API is versioned under `/api/v1`. It uses a Supabase user access token, not the Supabase service-role key:

```http
Authorization: Bearer <supabase-access-token>
```

Get a user token by signing in through the web app or Supabase Auth. The API resolves the user’s business membership and applies the same ADMIN/MEMBER scope rules as the web app.

### Endpoints

| Method | Endpoint | Scope | Description |
| --- | --- | --- | --- |
| `GET` | `/api/v1/account` | ADMIN | Business account, ledger, available balance, and holds |
| `GET` | `/api/v1/payments/{id}` | Authenticated member | Payment status and approval state |
| `POST` | `/api/v1/payments` | Authenticated member | Create a payment in the approval workflow |
| `GET` | `/api/v1/cards` | Authenticated member | Safe card metadata visible to the caller |
| `GET` | `/api/v1/cards/{token}` | Authenticated member | One permitted card’s safe metadata |
| `GET` | `/api/v1/reconciliation/breaks` | ADMIN | Reconciliation breaks |

Example:

```bash
API_URL=https://neobank-blush.vercel.app
TOKEN='<supabase-user-access-token>'

curl "$API_URL/api/v1/account" \
  -H "Authorization: Bearer $TOKEN"

curl "$API_URL/api/v1/cards" \
  -H "Authorization: Bearer $TOKEN"

curl -X POST "$API_URL/api/v1/payments" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: demo-payment-$(date +%s)" \
  -d '{
    "amountDollars": "125.00",
    "recipient": "Example Supplier",
    "accountNumber": "1234567890",
    "routingNumber": "021000021"
  }'
```

Amounts are integer cents. Payment creation is idempotent when the same `Idempotency-Key` is sent with the same authenticated user and request body. Reusing a key with different request data returns a conflict. Generate the key in the client that owns the operation; it is not supplied by Lithic or Supabase.

The API returns safe card metadata only. PAN, CVV, expiry, and PIN data are not returned by the public REST API or MCP server. Card details are available only through the authenticated web card-detail flow, where Lithic’s secure embed fields render the sensitive values.

Common responses include `401` for missing/invalid authentication, `403` for insufficient membership scope, `404` for an inaccessible resource, `409` for an idempotency or state conflict, and `400` for invalid request data.

The full contract and request/response schemas are in [docs/public-api.md](docs/public-api.md), [Scalar](/docs), and [OpenAPI](/api/v1/openapi.json).

## MCP server

The MCP server is available at:

```text
https://neobank-blush.vercel.app/api/mcp
```

It uses the MCP Streamable HTTP transport. Authenticate every request with the same Supabase user access token used by the REST API:

```http
Authorization: Bearer <supabase-access-token>
```

Do not use a Supabase service-role key in an AI client. The MCP route rejects unauthenticated requests before the MCP handler is invoked.

### Available tools

| Tool | Scope | Behavior |
| --- | --- | --- |
| `get_account_summary` | ADMIN | Returns account, ledger, available balance, and holds |
| `list_cards` | Authenticated member | Lists only cards visible to the caller |
| `get_card` | Authenticated member | Returns safe card metadata and provider state |
| `get_payment` | Authenticated member | Returns payment status and approval state |
| `create_payment` | Authenticated member | Preview by default; mutates only with explicit confirmation |
| `list_reconciliation_breaks` | ADMIN | Lists reconciliation breaks |

Card tools never return PAN, CVV, expiry, or PIN. An agent can see whether a card exists and its safe metadata, but cannot retrieve payment credentials or use the card directly. Card spending happens through the card network; the agent can assist with account/payment workflows subject to the caller’s permissions and approval rules.

### TypeScript client example

Install the MCP client in the agent project:

```bash
npm install @modelcontextprotocol/client
```

Connect over Streamable HTTP:

```ts
import { Client } from "@modelcontextprotocol/client";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/client/streamableHttp";

const client = new Client({ name: "corgi-agent", version: "1.0.0" });
const transport = new StreamableHTTPClientTransport(
  new URL("https://neobank-blush.vercel.app/api/mcp"),
  { requestInit: { headers: { Authorization: `Bearer ${userAccessToken}` } } },
);

await client.connect(transport);
const tools = await client.listTools();
console.log(tools.tools);

const account = await client.callTool({
  name: "get_account_summary",
  arguments: {},
});
console.log(account);
```

MCP hosts that manage their own server configuration should set the endpoint and bearer token in their secure connection settings. Do not put the token in prompts, source control, client-visible logs, or a public MCP configuration file.

### Safe payment flow

`create_payment` is deliberately two-step:

1. Call it with the payment details and an `idempotencyKey`. Without `confirmed: true`, it returns a preview and `requiresConfirmation: true` without creating a payment.
2. After the human or agent authorization policy confirms the preview, call it again with the identical details, the same idempotency key, and `confirmed: true`.

The confirmed call creates the normal payment/hold and approval-queue record. It does not bypass maker-checker approval. Never treat an MCP tool result as permission to skip the application’s approval policy.

## Environment variables

Start from `.env.example`. The main groups are:

- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
- Ledger fixture: `LEDGER_BUSINESS_ID`, `LEDGER_ACCOUNT_ID`.
- Demo users: `DEMO_ADMIN_EMAIL`, `DEMO_ADMIN_PASSWORD`, `DEMO_MEMBER_EMAIL`, `DEMO_MEMBER_PASSWORD`.
- App security: `PLAID_TOKEN_ENCRYPTION_KEY`, `NEXT_PUBLIC_APP_URL`.
- Persona: `PERSONA_API_KEY`, `PERSONA_VERSION`, `PERSONA_INQUIRY_TEMPLATE_ID`, `PERSONA_BUSINESS_INQUIRY_TEMPLATE_ID`, `PERSONA_OWNER_INQUIRY_TEMPLATE_ID`.
- Plaid: `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV`.
- Increase: `INCREASE_API_KEY`, `INCREASE_ENV`, `INCREASE_ACCOUNT_ID`, `INCREASE_WEBHOOK_SECRET`.
- Lithic: `LITHIC_API_KEY`, `LITHIC_WEBHOOK_SECRET`.

Missing provider credentials intentionally switch the relevant integration to its labeled deterministic simulator where supported. This is useful for local review, but production must configure provider credentials and webhook verification.

## Provider and safety boundaries

- Provider credentials and service-role keys stay server-side.
- Plaid access tokens and bank account/routing values are encrypted at rest and decrypted only immediately before the provider call.
- Public API and MCP authentication is user-scoped through Supabase Auth and business memberships.
- Payment mutations are idempotent and remain subject to approval thresholds and maker-checker controls.
- Lithic secure card fields are mounted by the SDK; this app does not store or expose PAN/CVV values.
- Provider webhooks must be configured and verified for Increase, Lithic, Persona, and Plaid before production handoff.
- Scheduled recovery and standing-order execution use an external cron provider; see [docs/external-crons.md](docs/external-crons.md).

## Integration evidence screenshots

The committed [integration evidence pack](docs/integration-evidence.md) contains sanitized provider-console screenshots captured on 2026-08-26:

- Increase: [account](docs/evidence/increase-01-account.jpg), [transactions](docs/evidence/increase-02-transactions.jpg), [inbound ACH](docs/evidence/increase-03-inbound-ach-timeline.jpg), [outbound ACH](docs/evidence/increase-04-outbound-ach-timeline.jpg), and [event record](docs/evidence/increase-05-event-record.jpg).
- Persona: [Sandbox KYC inquiries](docs/evidence/persona-01-inquiries.jpg) and [enabled webhook](docs/evidence/persona-02-webhooks.jpg).
- Lithic: [Sandbox card inventory](docs/evidence/lithic-01-cards.jpg) and [authorization/settlement activity](docs/evidence/lithic-02-activity.jpg).

The captures contain no API keys, webhook secrets, PAN/CVV values, or full bank details. They demonstrate sandbox state; a final live rehearsal still needs provider webhook-delivery IDs and the Corgi application’s card-delegation view.

## Repository guide

- `app/` — Next.js routes, pages, API endpoints, and MCP transport route.
- `src/integrations/` — provider adapters and live/simulated boundaries.
- `src/mcp/` — MCP server, auth context, tools, and tool scope.
- `src/lib/` — public API auth, ledger/payment helpers, and shared domain logic.
- `supabase/migrations/` — database schema and RPC migrations.
- `supabase/seed.sql` — deterministic demo fixture.
- `scripts/seed-demo-auth.mjs` — local demo Auth user provisioning.
- `docs/public-api.md` — REST/MCP behavior and security notes.
- `docs/integration-evidence.md` — integration smoke flow and evidence checklist.
- `decisions.md` — product and architecture decisions.

Historical implementation plans are not operational documentation; use this README and the linked docs for handoff.
