export type HoldState = {
  amountCents: number;
  status: "ACTIVE" | "RELEASED";
};

export function mergeHoldState(existing: HoldState | null, incoming: HoldState): HoldState {
  if (existing?.status === "RELEASED") return existing;
  return incoming;
}
