import { getAuthenticatedScope } from "@/src/lib/auth-scope";
import { createSupabaseFundingAccountRepository } from "@/src/repositories/supabase-funding-account-repository";
import { createSupabaseOnboardingRepository } from "@/src/repositories/supabase-onboarding-repository";
import { PlaidLinkButton } from "./PlaidLinkButton";
import { AddMoneyForm } from "./AddMoneyForm";
import { IconDollar } from "../components/Icon";
import { requirePageAccess } from "@/src/lib/page-authorization";

export const dynamic = "force-dynamic";

export default async function FundingPage() {
  const scope = await getAuthenticatedScope();
  requirePageAccess(scope, "/funding");
  const [onboarding, account] = await Promise.all([createSupabaseOnboardingRepository().get(scope.businessId), createSupabaseFundingAccountRepository().get(scope.businessId)]);
  const approved = onboarding?.businessStatus === "APPROVED" && onboarding.ownerStatus === "APPROVED";
  return <>
    <section className="intro"><div><h2>Funding</h2><p className="intro-copy">Connect the bank account used to add money.</p></div><span className={`pill ${account ? "pill-green" : "pill-orange"}`}>{account ? "LINKED" : "NOT LINKED"}</span></section>
    <section className="panel funding-panel"><div className="panel-heading"><div><p className="eyebrow">Linked account</p><h3>{account?.institutionName ?? "No account linked"}</h3>{account && <p className="list-meta">{account.accountName ?? "Checking"}{account.accountMask ? ` ····${account.accountMask}` : ""}</p>}</div></div>{account ? <><div className="panel-heading"><div><h3>Add money</h3></div><span className="chip chip-orange">PENDING to SETTLED</span></div><AddMoneyForm enabled={approved} /></> : <div className="empty-state"><div className="empty-icon"><IconDollar /></div><h4>{approved ? "Link a checking account" : "Verification required"}</h4><p>{approved ? "Connect the account that will fund this business account." : "Complete verification before linking a bank."}</p>{approved && <PlaidLinkButton />}</div>}</section>
  </>;
}
