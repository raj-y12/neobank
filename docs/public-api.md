# Public API

The v1 API is available under `/api/v1` and uses a Supabase user access token:

```http
Authorization: Bearer <supabase-access-token>
```

Interactive documentation is available at `/docs`; the machine-readable contract is `/api/v1/openapi.json`.

## Endpoints

- `GET /api/v1/account` — admin account summary
- `GET /api/v1/payments/{id}` — payment status; members can only read their own payments
- `POST /api/v1/payments` — queue an ACH payment for approval
- `GET /api/v1/cards` — card assignments; members see only their cards
- `GET /api/v1/cards/{token}` — one card assignment
- `GET /api/v1/reconciliation/breaks` — admin reconciliation breaks

Payment creation requires a client-generated idempotency key. Reuse the same key when retrying the same request:

```bash
curl -X POST https://your-host.example/api/v1/payments \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{"amountDollars":"25.00","recipient":"Example Supplier","accountNumber":"0000000000","routingNumber":"110000000"}'
```

Cards return assignment metadata only. PAN, CVV, and provider credentials are never exposed by the public API.
