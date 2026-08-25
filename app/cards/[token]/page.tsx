import Link from "next/link";
import { notFound } from "next/navigation";
import { getCardholderAmount, getLithicCard } from "@/src/integrations/lithic/client";
import { getAuthenticatedScope } from "@/src/lib/auth-scope";
import { getBusinessCardAssignment } from "@/src/repositories/supabase-business-card-repository";
import { canViewCard } from "@/src/domain/card-access";
import { listInternalCardTransactions } from "@/src/repositories/supabase-card-transaction-reader";
import { CardTile } from "../CardTile";
import { TransactionActivity } from "./TransactionActivity";

export const dynamic = "force-dynamic";

export default async function CardDetailPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const scope = await getAuthenticatedScope();
  const assignment = await getBusinessCardAssignment(scope.businessId, token);
  if (!assignment || !canViewCard({ role: scope.role, currentMemberId: scope.memberId, assignedMemberId: assignment.memberId })) notFound();
  let card;
  try { card = await getLithicCard(token); } catch { notFound(); }
  const transactions = await listInternalCardTransactions(token);
  const recentTransactions = [...transactions].sort((a, b) => new Date(b.updated ?? b.created ?? 0).getTime() - new Date(a.updated ?? a.created ?? 0).getTime());
  const transactionRows = recentTransactions.map((transaction) => ({ ...transaction, displayAmount: getCardholderAmount(transaction) }));

  return (
    <>
      <section className="card-detail-header">
        <Link className="back-link" href="/cards">← Cards</Link>
      </section>
      <section className="card-detail-hero" aria-label="Card details"><CardTile card={card} /></section>
      <section className="panel" style={{ marginTop: 14 }}>
        <div className="panel-heading"><div><p className="eyebrow">Activity</p><h3>Recent transactions</h3></div><span className="chip chip-neutral">{recentTransactions.length} · click a row</span></div>
        <TransactionActivity transactions={transactionRows} />
      </section>
    </>
  );
}
