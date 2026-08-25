import { getAuthenticatedScope } from "@/src/lib/auth-scope";
import { createSupabaseFundingAccountRepository } from "@/src/repositories/supabase-funding-account-repository";
import { createSupabaseOnboardingRepository } from "@/src/repositories/supabase-onboarding-repository";
import { PlaidLinkButton } from "./PlaidLinkButton";
import { AddMoneyForm } from "./AddMoneyForm";

export const dynamic = "force-dynamic";

export default async function FundingPage() {
  const scope = await getAuthenticatedScope();
  const [onboarding, account] = await Promise.all([createSupabaseOnboardingRepository().get(scope.businessId), createSupabaseFundingAccountRepository().get(scope.businessId)]);
  const approved = onboarding?.businessStatus === "APPROVED" && onboarding.ownerStatus === "APPROVED";
  return <>
    <section className="intro"><div><p className="eyebrow">Funding · Plaid sandbox</p><h2>Connect the funding account.</h2><p className="intro-copy">Plaid identifies the external checking account. It does not move funds or become the source of ledger truth.</p></div><span className={`pill ${account ? "pill-green" : "pill-orange"}`}>{account ? "LINKED" : "NOT LINKED"}</span></section>
    <section className="panel funding-panel"><div className="panel-heading"><div><p className="eyebrow">External bank</p><h3>{account?.institutionName ?? "No checking account linked"}</h3></div>{account && <span className="chip chip-green">LINKED</span>}</div>{account ? <><div className="linked-account"><div><span className="detail-label">Institution</span><strong>{account.institutionName ?? "Plaid sandbox institution"}</strong></div><div><span className="detail-label">Account</span><strong>{account.accountName ?? "Checking"}{account.accountMask ? ` ····${account.accountMask}` : ""}</strong></div><div><span className="detail-label">Status</span><strong className="status-text status-approved">{account.status}</strong></div></div><div className="panel-heading"><div><p className="eyebrow">Inbound ACH funding</p><h3>Add money</h3></div><span className="chip chip-orange">PENDING → SETTLED</span></div><AddMoneyForm enabled={approved} /></> : <div className="empty-state"><div className="empty-icon">$</div><h4>{approved ? "Link one checking account" : "Verification required"}</h4><p>{approved ? "Use Plaid Sandbox to connect the account that will fund this business account." : "Complete the Persona KYC check before linking a bank."}</p>{approved && <PlaidLinkButton />}</div>}</section>
  </>;
}
