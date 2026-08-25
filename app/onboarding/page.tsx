import { createSupabaseOnboardingRepository } from "@/src/repositories/supabase-onboarding-repository";
import { getAuthenticatedScope } from "@/src/lib/auth-scope";
import { OnboardingForm } from "./OnboardingForm";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const onboarding = await createSupabaseOnboardingRepository().get((await getAuthenticatedScope()).businessId);
  return <>
    <section className="intro"><div><p className="eyebrow">Business onboarding · Persona sandbox</p><h2>Verify the business.</h2><p className="intro-copy">Complete one Persona KYC check before cards, bank linking, or payments can move money.</p></div><span className={`pill ${onboarding?.businessStatus === "APPROVED" && onboarding.ownerStatus === "APPROVED" ? "pill-green" : "pill-orange"}`}>{onboarding ? onboarding.businessStatus : "NOT STARTED"}</span></section>
    <section className="panel onboarding-panel"><div className="panel-heading"><div><p className="eyebrow">Verification status</p><h3>{onboarding?.businessName ?? "Your business"}</h3></div></div><div className="verification-status-grid"><div><span className="detail-label">Business KYC</span><strong className={`status-text status-${(onboarding?.businessStatus ?? "PENDING").toLowerCase()}`}>{onboarding?.businessStatus ?? "PENDING"}</strong><small>One Persona identity verification</small></div></div><OnboardingForm existing={onboarding ? { businessName: onboarding.businessName, ownerName: onboarding.ownerName, ownerEmail: onboarding.ownerEmail } : null} /></section>
  </>;
}
