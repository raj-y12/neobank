import { getAuthenticatedScope } from "@/src/lib/auth-scope";
import { createSupabaseFundingAccountRepository } from "@/src/repositories/supabase-funding-account-repository";
import { createSupabaseOnboardingRepository } from "@/src/repositories/supabase-onboarding-repository";
import { IconChevronRight, IconDollar, IconUsers } from "../components/Icon";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const scope = await getAuthenticatedScope();
  const [onboarding, funding] = await Promise.all([
    createSupabaseOnboardingRepository().get(scope.businessId),
    createSupabaseFundingAccountRepository().get(scope.businessId),
  ]);
  const initials = (onboarding?.ownerName ?? scope.email ?? "C").split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const isVerified = onboarding?.businessStatus === "APPROVED" && onboarding.ownerStatus === "APPROVED";
  return <>
    <section className="account-profile-header">
      <div><h2>{onboarding?.ownerName ?? "Account"}</h2><p className="account-handle">{[onboarding?.businessName, scope.email].filter(Boolean).join(" · ") || "Business account"}</p></div>
      <div className="account-avatar" aria-hidden="true">{initials}</div>
    </section>

    <div className="account-settings">
      <section className="account-setting-section" aria-labelledby="business-section">
        <h3 id="business-section">Business</h3>
        <div className="settings-group">
          <div className="settings-row"><span className="settings-icon"><IconUsers /></span><span className="settings-copy"><strong>{onboarding?.businessName ?? "Business profile"}</strong><small>{onboarding?.ownerName ?? "Owner details not added"}</small></span><span className={`verification-badge ${isVerified ? "is-verified" : "is-pending"}`}>{isVerified ? "Verified" : "Not verified"}</span></div>
        </div>
      </section>

      <section className="account-setting-section" aria-labelledby="funding-section">
        <h3 id="funding-section">Funding</h3>
        <div className="settings-group">
          <div className="settings-row"><span className="settings-icon"><IconDollar /></span><span className="settings-copy"><strong>{funding?.institutionName ?? "No account linked"}</strong><small>{funding ? `${funding.accountName ?? "Checking"}${funding.accountMask ? ` ····${funding.accountMask}` : ""}` : "Connect a checking account to add money"}</small></span><span className={`settings-status ${funding ? "is-good" : ""}`}>{funding?.status ?? "Not linked"}</span></div>
        </div>
      </section>

      <section className="account-setting-section account-session" aria-labelledby="session-section">
        <h3 id="session-section">Session</h3>
        <div className="settings-group"><form action="/auth/signout" method="post"><button className="settings-row settings-button" type="submit"><span className="settings-copy"><strong>Sign out</strong><small>End this session</small></span><span aria-hidden="true"><IconChevronRight /></span></button></form></div>
      </section>
    </div>
  </>;
}
