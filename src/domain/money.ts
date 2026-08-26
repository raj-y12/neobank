export function dollarsToCents(value: string): number {
  const normalized = value.trim().replace(/^\$/, "");
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) throw new Error("Amount must be a positive dollar value with up to two decimals");
  const [dollars, cents = ""] = normalized.split(".");
  const amount = Number(dollars) * 100 + Number(cents.padEnd(2, "0"));
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error("Amount must be greater than zero");
  return amount;
}
