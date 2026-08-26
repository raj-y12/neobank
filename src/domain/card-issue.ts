export const CARD_LIMIT_DURATIONS = ["TRANSACTION", "MONTHLY", "ANNUALLY", "FOREVER"] as const;
export type CardLimitDuration = (typeof CARD_LIMIT_DURATIONS)[number];
export const CARD_COLORS = ["orange", "violet", "teal", "rose", "azure", "olive"] as const;
export type CardColor = (typeof CARD_COLORS)[number];

export function parseCardIssueInput(input: { memberId?: string; limit?: string; duration?: string; color?: string }) {
  const memberId = input.memberId?.trim();
  if (!memberId) throw new Error("Choose an employee");
  const rawLimit = input.limit?.trim() ?? "";
  if (!/^\d+(\.\d{1,2})?$/.test(rawLimit)) throw new Error("Limit must be a positive amount");
  const spendLimit = Math.round(Number(rawLimit) * 100);
  if (!Number.isSafeInteger(spendLimit) || spendLimit <= 0) throw new Error("Limit must be a positive amount");
  if (!CARD_LIMIT_DURATIONS.includes(input.duration as CardLimitDuration)) throw new Error("Unsupported limit duration");
  if (!CARD_COLORS.includes(input.color as CardColor)) throw new Error("Unsupported card color");
  return { memberId, spendLimit, spendLimitDuration: input.duration as CardLimitDuration, cardColor: input.color as CardColor };
}
