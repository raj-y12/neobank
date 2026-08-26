# Account Statements Design

## Goal

Turn the current card-correction journal view into a reviewer-ready, account-level statement experience that can reproduce a value-date period both as currently corrected and as known at a historical booking timestamp.

## Scope

This work covers one USD business account and the existing immutable journal. It adds an account statement surface, keeps card correction detail as a drill-down, fixes authenticated tenant scoping, and proves the Track 3 `$50 authorization → $73.40 settlement → later reversal` scenario.

It does not add a new mutable statement ledger, multi-currency support, PDF generation, or a production statement-delivery system.

## Decisions

### Statement grain

The primary statement is an account statement for one UTC value-date day. The route accepts a required `date=YYYY-MM-DD` and an optional `asOf=ISO-8601` booking timestamp. The default view is the current corrected view; `asOf` excludes journal entries learned after that timestamp.

### Source of truth

Statements are projections over `journal_entries` and `journal_postings`. Journal rows remain append-only. No statement row may be edited to apply a correction.

### Balance semantics

- Opening ledger balance: net `CUSTOMER_AVAILABLE + CUSTOMER_CARD_HOLDS + CUSTOMER_PAYMENT_HOLDS` before the statement date, using entries visible at the selected knowledge timestamp.
- Closing ledger balance: the same net through the end of the statement date.
- Opening and closing available balance: net `CUSTOMER_AVAILABLE` before and through the statement date.
- Holds: net `CUSTOMER_CARD_HOLDS + CUSTOMER_PAYMENT_HOLDS`, displayed separately and never presented as settled cash movement.
- Posted activity: entries that affect the customer available balance, including funding, payments, card settlements, and reversals.
- Running available balance: opening available balance plus each posted activity row in deterministic value-date/booking order.

### Bitemporal semantics

`value_date` determines which statement day an entry belongs to. `created_at` is the knowledge timestamp used by `asOf`. `booking_date` remains displayed as the persisted calendar date but does not replace the timestamp for exact historical reconstruction.

For a Thursday reversal correcting Tuesday's settlement:

- the current Tuesday statement includes both the Tuesday settlement and the reversal linked to it;
- a Tuesday statement viewed `asOf` Wednesday excludes the Thursday-learned reversal;
- the reversal retains Thursday's booking/knowledge timestamp and Tuesday's correction value date when the correction is allocated to that capture.

### Transaction classification

The projection returns explicit row kinds: `POSTED`, `HOLD`, and `CORRECTION`. A card authorization hold is not a posted transaction amount. A clearing is posted activity and may also release a hold; those effects are shown in separate fields.

### Authorization and tenant scope

The statement route resolves `businessId` and `accountId` from `getAuthenticatedScope()`. Card transaction lookup must prove ownership through the authenticated business's cards before loading related journal rows. Environment defaults are not valid statement scope.

## User experience

### Account statement route

Add `/statements` as the primary entry point. It defaults to the current UTC date or the latest available journal value date when data exists. Date and “known at” controls use query parameters and preserve the selected period.

The page displays:

1. Statement date and knowledge mode.
2. Opening ledger and available balances.
3. Posted activity table with value date, booked at, description, amount, and running available balance.
4. Separate holds/pending activity section.
5. Closing ledger and available balances.
6. A reconciliation line showing opening available plus posted activity equals closing available.
7. Empty, loading, and error states.

Each card-related posted row can link to the existing card correction detail page.

### Card correction detail

Retain `/statements/card/[transactionId]` for event-level investigation, but make it authenticated and scoped. Replace hardcoded dashboard links with `/statements` and links generated from actual transaction IDs.

## Interfaces

The domain projection exposes a pure function with these concepts:

```ts
type StatementQuery = {
  statementDate: string;
  asOfBookingTimestamp?: string;
};

type AccountStatement = {
  statementDate: string;
  asOfBookingTimestamp?: string;
  openingLedgerBalanceCents: number;
  openingAvailableBalanceCents: number;
  openingHoldsCents: number;
  closingLedgerBalanceCents: number;
  closingAvailableBalanceCents: number;
  closingHoldsCents: number;
  postedRows: StatementRow[];
  holdRows: StatementRow[];
};
```

The repository loads all scoped journal rows needed for the period and cutoff, maps postings into the domain input, and delegates balance/row derivation to the pure projection. The card-specific repository helper remains separate from the account statement query.

## Error handling

- Invalid dates or timestamps return a clear 400 response from the route or render the page's error state.
- Missing Supabase configuration returns the existing configuration error rather than silently using demo scope.
- A transaction ID outside the authenticated business returns not found, without revealing whether another business owns it.
- Empty periods render zero balances and an explicit no-activity state.

## Test strategy

Pure domain tests cover:

- opening/running/closing balances;
- posted versus hold classification;
- same-day deterministic ordering;
- current corrected versus historical `asOf` views;
- reversal linkage and reconciliation arithmetic;
- empty periods and negative/positive activity.

Repository/route tests cover:

- authenticated scope propagation;
- transaction ownership filtering;
- no environment-scope fallback;
- invalid query parameters;
- duplicate journal rows not changing a projection.

The live-fire fixture uses a $50 authorization hold, a $73.40 settlement two days later, and a later reversal allocated to the settlement's value date. It asserts the current corrected Tuesday statement, the Wednesday knowledge snapshot, and the exact opening-plus-activity-to-closing equation.

## Acceptance criteria

1. A reviewer can open `/statements` after login and see an account-level statement without manually supplying a card transaction ID.
2. The statement shows opening, running, and closing ledger/available balances.
3. Holds are visibly separate from posted cash movements.
4. A later reversal changes the corrected value-date statement without editing the original journal entry.
5. `asOf` reproduces what the ledger knew before the reversal was learned.
6. The account statement and card detail cannot read another business's records.
7. Dashboard statement links resolve to real statement routes and real transaction IDs.
8. The statement projection has automated tests for the Track 3 correction scenario.
