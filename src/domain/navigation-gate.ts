type GateInput = { onboardingApproved: boolean; fundingLinked: boolean; pathname: string };

export function shouldShowAppNavigation(input: { authenticated: boolean; onboardingApproved: boolean; fundingLinked: boolean }) {
  return input.authenticated && input.onboardingApproved && input.fundingLinked;
}

export function getRequiredRoute({ onboardingApproved, fundingLinked, pathname }: GateInput): "/onboarding" | "/funding" | null {
  if (pathname === "/account" || pathname.startsWith("/auth/")) return null;
  if (!onboardingApproved && pathname !== "/onboarding") return "/onboarding";
  if (onboardingApproved && !fundingLinked && pathname !== "/funding") return "/funding";
  return null;
}
