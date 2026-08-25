const PERSONA_BASE_URL = "https://api.withpersona.com/api/v1";

type PersonaInquiryResponse = { data?: { id?: string } };

export type PersonaInquiryInput = {
  templateId: string;
  referenceId: string;
  fields?: Record<string, string>;
};

async function personaFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const apiKey = process.env.PERSONA_API_KEY;
  if (!apiKey) throw new Error("PERSONA_API_KEY is not configured");
  const response = await fetch(`${PERSONA_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Persona-Version": process.env.PERSONA_VERSION ?? "2025-10-27",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Persona request failed with ${response.status}${detail ? `: ${detail}` : ""}`);
  }
  return response.json() as Promise<T>;
}

export async function createPersonaInquiry(input: PersonaInquiryInput) {
  const response = await personaFetch<PersonaInquiryResponse>("/inquiries", {
    method: "POST",
    body: JSON.stringify({ data: { attributes: {
      "inquiry-template-id": input.templateId,
      "reference-id": input.referenceId,
      ...(input.fields && Object.keys(input.fields).length > 0 ? { fields: input.fields } : {}),
    } } }),
  });
  const id = response.data?.id;
  if (!id) throw new Error("Persona did not return an inquiry ID");
  return { id, hostedFlowUrl: `https://inquiry.withpersona.com/verify?inquiry-id=${encodeURIComponent(id)}` };
}
