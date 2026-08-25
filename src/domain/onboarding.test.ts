import { describe, expect, it } from "vitest";
import { applySingleInquiryStatus, isBusinessApproved, mergeVerificationStatus, normalizePersonaStatus, requireApprovedBusiness } from "./onboarding";

describe("business onboarding gate", () => {
  it("requires both the business and owner checks to be approved", () => {
    expect(isBusinessApproved({ businessStatus: "APPROVED", ownerStatus: "PENDING" })).toBe(false);
    expect(isBusinessApproved({ businessStatus: "APPROVED", ownerStatus: "APPROVED" })).toBe(true);
  });

  it("does not let an older Persona pending event move approval backwards", () => {
    expect(mergeVerificationStatus("APPROVED", "PENDING")).toBe("APPROVED");
    expect(mergeVerificationStatus("PENDING", "APPROVED")).toBe("APPROVED");
  });

  it("applies one KYC inquiry result to the demo gate", () => {
    expect(applySingleInquiryStatus({ businessStatus: "PENDING", ownerStatus: "PENDING" }, "APPROVED")).toEqual({ businessStatus: "APPROVED", ownerStatus: "APPROVED" });
  });

  it("normalizes Persona inquiry outcomes", () => {
    expect(normalizePersonaStatus("approved")).toBe("APPROVED");
    expect(normalizePersonaStatus("declined")).toBe("REJECTED");
    expect(normalizePersonaStatus("inquiry.started")).toBe(null);
  });

  it("throws for an unapproved business", () => {
    expect(() => requireApprovedBusiness({ businessStatus: "APPROVED", ownerStatus: "REJECTED" })).toThrow("Business verification");
  });
});
