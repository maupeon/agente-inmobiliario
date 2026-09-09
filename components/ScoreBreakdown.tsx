import type { PersonalScoring } from "@/types";

export function ScoreBreakdown({ score, scoring }: { score?: number; scoring?: PersonalScoring }) {
  if (!scoring) return null;
  return (
    <details className="mt-3 rounded-xl border border-hairline bg-paper-50 p-3 text-sm">
      <summary className="min-h-11 cursor-pointer leading-relaxed text-ink">
        <strong>Score HabitIA: {scoring.coveragePercent ? `${score ?? 0}/100` : "sin datos"}</strong>
        <span className="ml-2 text-xs font-normal text-stone-600">Cobertura de pesos {scoring.coveragePercent}% · ver desglose</span>
      </summary>
      <p className="mt-2 text-xs leading-relaxed text-stone-600">{scoring.explanation}</p>
      <dl className="mt-3 space-y-3">
        {scoring.components.map((c) => (
          <div key={c.key}>
            <dt className="flex flex-wrap justify-between gap-2 font-medium">
              <span>{c.label} · peso {c.weight}%</span>
              <span>{c.value == null ? "Sin dato · 0 puntos aportados" : `${c.value}/100 → ${c.contribution} puntos`}</span>
            </dt>
            <dd className="mt-1 text-xs leading-relaxed text-stone-600">{c.explanation}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
