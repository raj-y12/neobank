import Link from "next/link";
import { notFound } from "next/navigation";
import { getCardholderAmount, getLithicCard } from "@/src/integrations/lithic/client";
import { getAuthenticatedScope } from "@/src/lib/auth-scope";
import { getBusinessCardAssignment } from "@/src/repositories/supabase-business-card-repository";
import { canViewCard } from "@/src/domain/card-access";
import { listInternalCardTransactions } from "@/src/repositories/supabase-card-transaction-reader";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { CardTile } from "../CardTile";
import { CardDelegateForm } from "../CardDelegateForm";
import { TransactionActivity } from "./TransactionActivity";
import { IconChevronLeft } from "../../components/Icon";

export const dynamic = "force-dynamic";

export default async function CardDetailPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const scope = await getAuthenticatedScope();
  const assignment = await getBusinessCardAssignment(scope.businessId, token);
  if (!assignment || !canViewCard({ role: scope.role, currentMemberId: scope.memberId, assignedMemberId: assignment.memberId })) notFound();
  let card;
  try { card = await getLithicCard(token); } catch { notFound(); }
  const [transactions, employeesResult] = await Promise.all([
    listInternalCardTransactions(token),
    scope.role === "ADMIN"
      ? createSupabaseAdminClient().from("business_members").select("id,first_name,last_name,email,role,status").eq("business_id", scope.businessId).order("created_at", { ascending: true })
      : Promise.resolve({ data: [] as { id: string; first_name: string | null; last_name: string | null; email: string | null; role: string; status: string }[] }),
  ]);
  const recentTransactions = [...transactions].sort((a, b) => new Date(b.updated ?? b.created ?? 0).getTime() - new Date(a.updated ?? a.created ?? 0).getTime());
  const transactionRows = recentTransactions.map((transaction) => ({ ...transaction, displayAmount: getCardholderAmount(transaction) }));

  return (
    <div className="card-detail-column">
      <Link className="back-link" href="/cards"><IconChevronLeft /> Cards</Link>
      <section className="card-detail-hero" aria-label="Card details"><CardTile card={card} delegatedTo={assignment.employeeName ?? assignment.employeeEmail} cardColor={assignment.cardColor} /></section>
      {scope.role === "ADMIN" && <CardDelegateForm cardToken={token} assignedMemberId={assignment.memberId} employees={(employeesResult.data ?? []).map((employee) => ({ id: employee.id, firstName: employee.first_name, lastName: employee.last_name, email: employee.email, role: employee.role, status: employee.status }))} />}
      <section className="panel panel-flat">
        <div className="panel-heading"><div><h3>Recent activity</h3></div><span className="chip chip-neutral">{recentTransactions.length}</span></div>
        <TransactionActivity transactions={transactionRows} />
      </section>
    </div>
  );
}
