export function personaMode() {
  return process.env.PERSONA_API_KEY ? "LIVE" as const : "SIMULATED" as const;
}
