import { createSupabaseOnboardingRepository } from "@/src/repositories/supabase-onboarding-repository";
import { getAuthenticatedScope } from "@/src/lib/auth-scope";
import { OnboardingForm } from "./OnboardingForm";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const onboarding = await createSupabaseOnboardingRepository().get((await getAuthenticatedScope()).businessId);
  return <>
    <section className="intro"><div><h2>Verification</h2><p className="intro-copy">Verify the business before moving money.</p></div></section>
    <section className="panel onboarding-panel"><div className="panel-heading"><div><h3>Business verification</h3></div><span className={`chip chip-${(onboarding?.businessStatus ?? "PENDING") === "APPROVED" ? "green" : "orange"}`}>{onboarding?.businessStatus ?? "NOT STARTED"}</span></div><OnboardingForm existing={onboarding ? { businessName: onboarding.businessName, ownerName: onboarding.ownerName, ownerEmail: onboarding.ownerEmail } : null} /></section>
  </>;
}
