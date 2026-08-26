# Member access and request history design

## Goal

Make `MEMBER` an employee-facing role. A member can use their delegated card, initiate a payment, and follow the outcome of only their own payment requests. Business administration, company-wide financial data, and approval decisions remain available only to `ADMIN`.

## Access model

| Surface | `ADMIN` | `MEMBER` |
| --- | --- | --- |
| Overview | Business balances, ledger activity, and approval summary | Own delegated card and recent payment requests |
| Cards | All business cards; issue and delegate | Own delegated card and its activity |
| Send money | Create payments | Create payments |
| Approvals | View the pending business queue; approve or reject | Read-only history of own initiated requests |
| Employees | Manage employees | No access |
| Funding | Link funding source and add money | No access |
| Statements and all transactions | View business account activity | No access |
| Reconciliation | Import, inspect, and resolve breaks | No access |
| Account | Business settings and session | Personal identity and session |

## Authorization architecture

Define the role policy once in the domain layer and use it at every boundary. The policy identifies admin-only routes, shared routes, navigation items, and role-specific capabilities. It complements resource-level checks such as the existing delegated-card predicate; it does not replace them.

Server-rendered page entry points must resolve the authenticated scope before reading protected data. A member who directly visits an admin-only page is redirected to the member home. Admin-only API operations return `403`. Queries executed through service-role clients must apply both the authenticated business scope and the member/resource filter required by the policy.

The UI uses the same policy to omit inaccessible links and actions. UI hiding is a usability feature, never the authorization boundary.

## Route behavior

Admin-only routes are `/team`, `/funding`, `/statements`, and `/reconciliation`. Shared routes are `/`, `/cards`, `/payments`, `/approvals`, and `/account`.

Shared routes render role-specific content:

- `/` shows the existing business dashboard to admins. Members see a personal summary containing their delegated card and recent requests; it never reads or renders business-wide balances or ledger activity.
- `/cards` preserves the current behavior: admins see all cards and card-management controls, while members see only cards assigned to their authenticated member ID.
- `/payments` remains available to both roles and records the authenticated member ID as the initiator.
- `/approvals` shows the actionable pending queue to admins. For members it is labelled **My requests** and shows a read-only history filtered to their authenticated member ID.
- `/account` retains business and funding details for admins. Members see their own identity and the sign-out action only.

The member navigation contains Overview, Cards, Send money, and My requests, plus the account entry. The admin navigation retains the full product navigation.

## Request history data flow

The approval-list endpoint resolves the authenticated scope before querying payments.

- For an admin, it returns business-scoped payments in `PENDING_APPROVAL` state for the existing approve/reject queue.
- For a member, it returns payments matching both `business_id` and `initiator_member_id`, ordered newest first. No request parameter may select a different member.

Member rows contain only the fields required by the UI: payment ID, recipient display name, amount, creation time, and status. Beneficiary bank details, other member identifiers, and approval controls are not returned.

The member view represents the full payment lifecycle with readable labels:

| Stored state | Member label |
| --- | --- |
| `PENDING_APPROVAL` | Pending approval |
| `APPROVED` | Approved |
| `SUBMITTED` | Submitted |
| `SETTLED` | Settled |
| `REJECTED` | Rejected |
| `RETURNED` | Returned |

An empty result displays **No requests yet**. Failed requests show a recoverable error message and do not reveal authorization or record-existence details.

## Page protection

Admin-only pages should use server entry points so authorization happens before their client components load or fetch. Existing client-only screens can be retained behind a small server wrapper. A shared guard redirects members away from inaccessible pages before protected service-role reads occur.

API authorization remains explicit. Read and mutation routes for employees, funding administration, statements, reconciliation, card issuance/delegation, and approval decisions must reject members with `403`. Resource reads that intentionally remain shared must enforce personal scope.

## Testing

Add automated coverage for:

- the complete `ADMIN`/`MEMBER` route and navigation policy;
- member redirects from every admin-only page;
- `403` responses from every admin-only API operation;
- member request history filtering by both business ID and initiator member ID;
- absence of another employee's request in member results;
- admin approval-queue behavior and approve/reject actions remaining unchanged;
- readable rendering of pending, approved, submitted, settled, rejected, and returned states;
- member empty and error states;
- member overview and account pages not reading or rendering business-wide financial data;
- regression coverage for own-card visibility and admin card management.

Run the focused tests followed by the repository test, type-check, lint, and production-build checks.

## Out of scope

This change does not add custom roles, per-user permission editing, approval thresholds, multiple business memberships, or a configurable RBAC system. Those require a separate product decision if the two-role model no longer fits.
