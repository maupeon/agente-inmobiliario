import type { PersonalScoring } from "@/types";
import styles from "./ScoreBreakdown.module.css";

const COMPONENTS = [
  { key: "fair", name: "Fair", description: "Precio" },
  { key: "opportunity", name: "Opportunity", description: "Inversión" },
  { key: "zone", name: "Zone", description: "Calidad de vida" },
  { key: "lifestyle", name: "Lifestyle", description: "Tiempo al trabajo" },
] as const;

export function ScoreBreakdown({ score, scoring }: { score?: number; scoring?: PersonalScoring }) {
  if (!scoring) return null;
  return (
    <section className={styles.root} aria-label="Desglose del HabitIA Score">
      <div className={styles.heading}>
        <strong>HabitIA Score: {scoring.coveragePercent ? `${score ?? 0}/100` : "sin datos"}</strong>
        <span>Datos para el {scoring.coveragePercent}% de tus pesos</span>
      </div>
      <dl className={styles.metrics} aria-label="Los cuatro subscores">
        {COMPONENTS.map(({ key, name, description }) => {
          const component = scoring.components.find((c) => c.key === key);
          const value = component?.value;
          return <div key={key} className={styles.metric}>
            <dt>{name}<span>{description}</span></dt>
            <dd className={value == null ? styles.missing : undefined}>
              {value == null ? <><span aria-hidden>—</span><small>Sin dato</small></> : <>{value.toLocaleString("es-ES", { maximumFractionDigits: 1 })}<small>/100</small></>}
            </dd>
          </div>;
        })}
      </dl>
      <details className={styles.details}>
        <summary>Cómo se calcula y qué aporta cada factor</summary>
        <p className="mt-2 text-xs leading-relaxed text-stone-600">{scoring.explanation}</p>
        <p className="mt-2 text-xs text-stone-600">Podemos evaluar el {scoring.coveragePercent}% de tus prioridades ponderadas. Los criterios sin datos no suman puntos y sus pesos no se reparten entre los demás.</p>
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
    </section>
  );
}
