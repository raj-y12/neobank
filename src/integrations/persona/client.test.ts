import { afterEach, describe, expect, it, vi } from "vitest";
import { createPersonaInquiry } from "./client";

describe("Persona inquiry client", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("does not send unsupported prefill fields when the template collects them", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { id: "inq_test" } }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("PERSONA_API_KEY", "persona_test");

    await createPersonaInquiry({ templateId: "itmpl_kyc", referenceId: "demo:business", fields: {} });

    const request = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(request.data.attributes).not.toHaveProperty("fields");
  });
});
