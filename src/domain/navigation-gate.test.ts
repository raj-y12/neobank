import { describe, expect, it } from "vitest";
import { getRequiredRoute, shouldShowAppNavigation } from "./navigation-gate";

describe("navigation gate", () => {
  it("keeps an unapproved user in onboarding", () => {
    expect(getRequiredRoute({ onboardingApproved: false, fundingLinked: false, pathname: "/cards" })).toBe("/onboarding");
  });

  it("moves an approved user without funding to funding", () => {
    expect(getRequiredRoute({ onboardingApproved: true, fundingLinked: false, pathname: "/" })).toBe("/funding");
  });

  it("allows account and sign-out escape hatches while gated", () => {
    expect(getRequiredRoute({ onboardingApproved: false, fundingLinked: false, pathname: "/account" })).toBeNull();
    expect(getRequiredRoute({ onboardingApproved: false, fundingLinked: false, pathname: "/auth/signout" })).toBeNull();
  });

  it("allows all app routes once onboarding and funding are complete", () => {
    expect(getRequiredRoute({ onboardingApproved: true, fundingLinked: true, pathname: "/cards" })).toBeNull();
  });

  it("hides the app navigation until login and setup are complete", () => {
    expect(shouldShowAppNavigation({ authenticated: false, onboardingApproved: false, fundingLinked: false })).toBe(false);
    expect(shouldShowAppNavigation({ authenticated: true, onboardingApproved: false, fundingLinked: false })).toBe(false);
    expect(shouldShowAppNavigation({ authenticated: true, onboardingApproved: true, fundingLinked: false })).toBe(false);
    expect(shouldShowAppNavigation({ authenticated: true, onboardingApproved: true, fundingLinked: true })).toBe(true);
  });
});
