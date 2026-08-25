type GateInput = { onboardingApproved: boolean; fundingLinked: boolean; pathname: string };

export function getRequiredRoute({ onboardingApproved, fundingLinked, pathname }: GateInput): "/onboarding" | "/funding" | null {
  if (pathname === "/account" || pathname.startsWith("/auth/")) return null;
  if (!onboardingApproved && pathname !== "/onboarding") return "/onboarding";
  if (onboardingApproved && !fundingLinked && pathname !== "/funding") return "/funding";
  return null;
}
