export type ReconciliationLedgerRow = { referenceId: string; amountCents: number };
export type ReconciliationProviderRow = { referenceId: string; amountCents: number };
export type ReconciliationBreakType = "IN_FILE_NOT_LEDGER" | "IN_LEDGER_NOT_FILE" | "AMOUNT_MISMATCH";
export type ReconciliationBreak = {
  breakType: ReconciliationBreakType;
  providerReference: string;
  ledgerReference?: string;
  expectedAmountCents?: number;
  actualAmountCents?: number;
};

export function diffReconciliation(
  providerRows: ReconciliationProviderRow[],
  ledgerRows: ReconciliationLedgerRow[],
): ReconciliationBreak[] {
  const ledgerByReference = new Map(ledgerRows.map((row) => [row.referenceId, row]));
  const providerReferences = new Set(providerRows.map((row) => row.referenceId));
  const breaks: ReconciliationBreak[] = [];

  for (const providerRow of providerRows) {
    const ledgerRow = ledgerByReference.get(providerRow.referenceId);
    if (!ledgerRow) {
      breaks.push({ breakType: "IN_FILE_NOT_LEDGER", providerReference: providerRow.referenceId, actualAmountCents: providerRow.amountCents });
    } else if (ledgerRow.amountCents !== providerRow.amountCents) {
      breaks.push({
        breakType: "AMOUNT_MISMATCH",
        providerReference: providerRow.referenceId,
        ledgerReference: ledgerRow.referenceId,
        expectedAmountCents: ledgerRow.amountCents,
        actualAmountCents: providerRow.amountCents,
      });
    }
  }

  for (const ledgerRow of ledgerRows) {
    if (!providerReferences.has(ledgerRow.referenceId)) {
      breaks.push({ breakType: "IN_LEDGER_NOT_FILE", providerReference: ledgerRow.referenceId, ledgerReference: ledgerRow.referenceId, expectedAmountCents: ledgerRow.amountCents });
    }
  }
  return breaks;
}

export function ageBucket(createdAt: string, now = new Date("2026-08-25T00:00:00Z")) {
  const ageDays = Math.max(0, Math.floor((now.getTime() - new Date(createdAt).getTime()) / 86_400_000));
  if (ageDays <= 1) return "0-1d";
  if (ageDays <= 3) return "2-3d";
  if (ageDays <= 7) return "4-7d";
  return "8d+";
}
