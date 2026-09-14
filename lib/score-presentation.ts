import type { PersonalScoring } from "@/types";

export function evaluationLabel(scoring: PersonalScoring): string {
  if (!scoring.coveragePercent) return "Evaluación sin datos";
  if (scoring.coveragePercent >= 100) return "HabitIA Score";
  const available = scoring.components.filter(c => c.weight > 0 && c.value != null);
  return available.length === 1 && available[0].key === "lifestyle"
    ? "Evaluación parcial: solo trayecto disponible"
    : "Evaluación parcial";
}
