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

export type JournalTransferRow = {
  referenceId: string | null;
  entryType: string;
  postings: Array<{ accountCode: string; debitCents: number; creditCents: number }>;
};

export function journalRowsForTransfers(entries: JournalTransferRow[]): ReconciliationLedgerRow[] {
  return entries.flatMap((entry) => {
    if (!entry.referenceId) return [];
    const safeguardedCash = entry.postings
      .filter((posting) => posting.accountCode === "SAFEGUARDED_CASH")
      .reduce((amount, posting) => amount + posting.debitCents - posting.creditCents, 0);
    const customerAvailable = entry.postings
      .filter((posting) => posting.accountCode === "CUSTOMER_AVAILABLE")
      .reduce((amount, posting) => amount + posting.creditCents - posting.debitCents, 0);
    const amountCents = entry.entryType === "FUNDING_SETTLEMENT"
      ? (safeguardedCash || customerAvailable)
      : entry.entryType === "PAYMENT_SETTLEMENT"
        ? safeguardedCash
        : null;
    return amountCents === null || amountCents === 0 ? [] : [{ referenceId: entry.referenceId, amountCents }];
  });
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') { value += '"'; index += 1; }
      else quoted = !quoted;
    } else if (character === "," && !quoted) {
      values.push(value.trim()); value = "";
    } else value += character;
  }
  if (quoted) throw new Error("CSV contains an unterminated quote");
  values.push(value.trim());
  return values;
}

export function parseReconciliationCsv(csv: string): ReconciliationProviderRow[] {
  const lines = csv.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) throw new Error("Reconciliation CSV requires a header and at least one row");
  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase());
  const referenceIndex = headers.indexOf("provider_reference");
  const amountIndex = headers.indexOf("amount_cents");
  if (referenceIndex < 0) throw new Error("CSV requires provider_reference column");
  if (amountIndex < 0) throw new Error("CSV requires amount_cents column");
  const references = new Set<string>();
  return lines.slice(1).map((line, rowIndex) => {
    const values = parseCsvLine(line);
    const referenceId = values[referenceIndex];
    const amountCents = Number(values[amountIndex]);
    if (!referenceId || references.has(referenceId)) throw new Error(`Invalid or duplicate provider_reference on row ${rowIndex + 2}`);
    if (!Number.isSafeInteger(amountCents)) throw new Error(`Invalid amount_cents on row ${rowIndex + 2}`);
    references.add(referenceId);
    return { referenceId, amountCents };
  });
}

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

export function ageBucket(createdAt: string, now = new Date()) {
  const ageDays = Math.max(0, Math.floor((now.getTime() - new Date(createdAt).getTime()) / 86_400_000));
  if (ageDays <= 1) return "0-1d";
  if (ageDays <= 3) return "2-3d";
  if (ageDays <= 7) return "4-7d";
  return "8d+";
}
