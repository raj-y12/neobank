import { describe, expect, it } from "vitest";
import { publicApiOpenApi } from "./public-api-openapi";

describe("public API OpenAPI contract", () => {
  it("documents the v1 account, payment, card, and reconciliation operations", () => {
    expect(Object.keys(publicApiOpenApi.paths)).toEqual([
      "/api/v1/account",
      "/api/v1/payments/{id}",
      "/api/v1/payments",
      "/api/v1/cards",
      "/api/v1/cards/{token}",
      "/api/v1/reconciliation/breaks",
    ]);
    expect(publicApiOpenApi.components.securitySchemes.bearerAuth).toEqual({
      type: "http",
      scheme: "bearer",
      bearerFormat: "Supabase JWT",
    });
  });
});
