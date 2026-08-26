export const publicApiOpenApi = {
  openapi: "3.1.0",
  info: { title: "Neobank Public API", version: "1.0.0", description: "Account, payment, card, and reconciliation data for approved businesses." },
  servers: [{ url: "/" }],
  security: [{ bearerAuth: [] }],
  paths: {
    "/api/v1/account": { get: { summary: "Get account summary", responses: { "200": { description: "Account summary" }, "401": { description: "Unauthorized" } } } },
    "/api/v1/payments/{id}": { get: { summary: "Get payment status", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Payment" }, "404": { description: "Payment not found" } } } },
    "/api/v1/payments": { post: { summary: "Queue an ACH payment", parameters: [{ name: "Idempotency-Key", in: "header", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["amountDollars", "recipient", "accountNumber", "routingNumber"], properties: { amountDollars: { type: "string" }, recipient: { type: "string" }, accountNumber: { type: "string" }, routingNumber: { type: "string" } } } } } }, responses: { "201": { description: "Payment queued" }, "400": { description: "Invalid payment" } } } },
    "/api/v1/cards": { get: { summary: "List business cards", responses: { "200": { description: "Card assignments" } } } },
    "/api/v1/cards/{token}": { get: { summary: "Get a business card", parameters: [{ name: "token", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Card assignment" }, "404": { description: "Card not found" } } } },
    "/api/v1/reconciliation/breaks": { get: { summary: "List reconciliation breaks", responses: { "200": { description: "Reconciliation breaks" } } } },
  },
  components: { securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "Supabase JWT" } } },
} as const;
