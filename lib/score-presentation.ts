import type { PersonalScoring } from "@/types";

export function evaluationLabel(scoring: PersonalScoring): string {
  if (!scoring.coveragePercent) return "HabitIA Score · sin datos";
  if (scoring.coveragePercent >= 100) return "HabitIA Score";
  const available = scoring.components.filter(c => c.weight > 0 && c.value != null);
  return available.length === 1 && available[0].key === "lifestyle"
    ? "HabitIA Score · parcial, solo trayecto"
    : "HabitIA Score · parcial";
}
