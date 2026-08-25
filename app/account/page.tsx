import { getAuthenticatedScope } from "@/src/lib/auth-scope";
import { createSupabaseFundingAccountRepository } from "@/src/repositories/supabase-funding-account-repository";
import { createSupabaseOnboardingRepository } from "@/src/repositories/supabase-onboarding-repository";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const scope = await getAuthenticatedScope();
  const [onboarding, funding] = await Promise.all([
    createSupabaseOnboardingRepository().get(scope.businessId),
    createSupabaseFundingAccountRepository().get(scope.businessId),
  ]);
  return <>
    <section className="intro"><div><p className="eyebrow">Account</p><h2>Business profile and connections.</h2><p className="intro-copy">Review the information used to operate this business account.</p></div><span className="pill pill-green">{scope.role}</span></section>
    <section className="content-grid account-grid">
      <article className="panel"><div className="panel-heading"><div><p className="eyebrow">Business details</p><h3>{onboarding?.businessName ?? "Not started"}</h3></div></div><div className="linked-account"><div><span className="detail-label">Signed in as</span><strong>{scope.email ?? "Demo user"}</strong></div><div><span className="detail-label">Owner / director</span><strong>{onboarding?.ownerName ?? "—"}</strong></div><div><span className="detail-label">KYC status</span><strong className={`status-text status-${(onboarding?.businessStatus ?? "PENDING").toLowerCase()}`}>{onboarding?.businessStatus ?? "PENDING"}</strong></div></div></article>
      <article className="panel"><div className="panel-heading"><div><p className="eyebrow">Funding account</p><h3>{funding?.institutionName ?? "Not linked"}</h3></div></div><div className="linked-account"><div><span className="detail-label">Account</span><strong>{funding ? `${funding.accountName ?? "Checking"}${funding.accountMask ? ` ····${funding.accountMask}` : ""}` : "No external account linked"}</strong></div><div><span className="detail-label">Status</span><strong>{funding?.status ?? "NOT LINKED"}</strong></div></div></article>
    </section>
    <section className="panel account-actions"><p className="eyebrow">Session</p><form action="/auth/signout" method="post"><button className="btn btn-outline" type="submit">Sign out</button></form></section>
  </>;
}
