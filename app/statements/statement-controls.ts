export function parseStatementDate(value: string | null | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? value : null;
}

export function datetimeLocalToIso(value: string | null | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const [datePart, timePart] = value.split("T");
  const date = parseStatementDate(datePart);
  if (!date) return null;
  const [hour, minute] = timePart.split(":").map(Number);
  if (hour > 23 || minute > 59) return null;
  return new Date(`${date}T${timePart}:00.000Z`).toISOString();
}

export function isTransactionsOnlyView(value: string | null | undefined) {
  return value === "transactions";
}
