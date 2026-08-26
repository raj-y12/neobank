import { planLithicLifecycle, type LithicSnapshot, type PlannedLithicCommand, type PlannedLithicEvent } from "../domain/lithic-lifecycle";

type LithicLifecycleOptions = {
  now: string;
  forcePostGraceMs?: number;
  initialState?: { remainingHoldCents: number; cumulativeSettledSigned: number; hasAuthorization: boolean };
  excludedSemanticEventIds?: Set<string>;
};

export type LithicLifecycleDependencies = {
  project(event: PlannedLithicEvent): Promise<void>;
  park(event: PlannedLithicEvent): Promise<void>;
  markMatched(event: PlannedLithicEvent): Promise<void>;
  record(command: PlannedLithicCommand): Promise<void>;
};

export async function processLithicLifecycle(
  snapshots: LithicSnapshot[],
  options: LithicLifecycleOptions,
  dependencies: LithicLifecycleDependencies,
) {
  const plan = planLithicLifecycle(snapshots, options);
  const commands = new Map(plan.commands.map((command) => [command.semanticEventId, command]));
  for (const event of plan.events) {
    if (event.disposition === "PARKED" || event.disposition === "AMBIGUOUS") {
      await dependencies.park(event);
      continue;
    }
    await dependencies.project(event);
    if (event.disposition === "READY") await dependencies.markMatched(event);
    const command = commands.get(event.semanticEventId);
    if (command) await dependencies.record(command);
  }
  return plan;
}
