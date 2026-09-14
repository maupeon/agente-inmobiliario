import type { PersonalScoring } from "@/types";
import { evaluationLabel } from "@/lib/score-presentation";
import styles from "./ScoreBreakdown.module.css";

const COMPONENTS = [
  { key: "fair", name: "Fair", description: "Precio" },
  { key: "opportunity", name: "Opportunity", description: "Inversión" },
  { key: "zone", name: "Zone", description: "Entorno del distrito" },
  { key: "lifestyle", name: "Lifestyle", description: "Tiempo al trabajo" },
] as const;

export function ScoreBreakdown({ score, scoring }: { score?: number; scoring?: PersonalScoring }) {
  if (!scoring) return null;
  return (
    <section className={styles.root} aria-label="Desglose del HabitIA Score">
      <div className={styles.heading}>
        <strong>{evaluationLabel(scoring)}{scoring.coveragePercent >= 100 ? `: ${score ?? 0}/100` : ""}</strong>
        <span>Datos para el {scoring.coveragePercent.toLocaleString("es-ES", { maximumFractionDigits: 1 })}% de tus pesos</span>
      </div>
      <dl className={styles.metrics} aria-label="Los cuatro subscores">
        {COMPONENTS.map(({ key, name, description }) => {
          const component = scoring.components.find((c) => c.key === key);
          const value = component?.value;
          return <div key={key} className={styles.metric}>
            <dt>{name}<span>{description}</span></dt>
            <dd className={value == null ? styles.missing : undefined}>
              {value == null ? <><span aria-hidden>—</span><small>{component?.explanation.startsWith("No aplica") ? "No aplica" : "Sin dato"}</small></> : <>{value.toLocaleString("es-ES", { maximumFractionDigits: 1 })}<small>/100</small></>}
              {key === "zone" && scoring.zone && <small className={styles.metricNote}>{scoring.zone.available < 5 ? "Parcial · " : ""}{scoring.zone.available}/5 indicadores</small>}
            </dd>
          </div>;
        })}
      </dl>
      {scoring.fair && <details className={styles.details}>
        <summary>Fair · comparación con la estimación</summary>
        <p className="my-2 text-xs leading-relaxed text-stone-600">Anuncio: {scoring.fair.advertisedPrice.toLocaleString("es-ES", { maximumFractionDigits: 0 })} {scoring.fair.unit}. Estimación: {scoring.fair.estimatedPrice.toLocaleString("es-ES", { maximumFractionDigits: 0 })} {scoring.fair.unit} · referencia {scoring.fair.period}.</p>
        <p className="mb-3 text-xs leading-relaxed text-stone-600">{scoring.components.find(c => c.key === "fair")?.explanation}</p>
      </details>}
      {scoring.opportunity && <details className={styles.details}>
        <summary>Opportunity · distrito de {scoring.opportunity.district}</summary>
        <p className="my-2 text-xs leading-relaxed text-stone-600">{scoring.components.find(c => c.key === "opportunity")?.explanation}</p>
        <p className="mb-3 text-xs text-stone-600"><a href={scoring.opportunity.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{scoring.opportunity.source}</a> · consulta {scoring.opportunity.retrievedAt}. Copia de la variación anual publicada, sin actualización automática.</p>
      </details>}
      {scoring.zone && <details className={styles.details}>
        <summary>Zone · distrito de {scoring.zone.district} · {scoring.zone.available}/5 indicadores</summary>
        <p className="mt-2 text-xs leading-relaxed text-stone-600">Cada indicador aporta hasta 20 puntos. El valor parcial suma los puntos disponibles sobre 100; los indicadores ausentes conservan su peso y no se consideran cero observado. Son datos de distrito, no mediciones del barrio o la vivienda.</p>
        <dl className="my-3 space-y-3 text-xs leading-relaxed">
          {scoring.zone.indicators.map(indicator => <div key={indicator.key}>
            <dt className="font-medium">{indicator.label} · {indicator.index == null ? "Sin dato" : `${(indicator.index * 100).toLocaleString("es-ES", { maximumFractionDigits: 1 })}/100`}</dt>
            <dd className="mt-1 text-stone-600">
              {indicator.rawValue == null ? "Valor territorial pendiente." : `${indicator.rawValue.toLocaleString("es-ES", { maximumFractionDigits: 2 })} ${indicator.unit}. ${indicator.inverse ? "Menos" : "Más"} cantidad, mayor índice.`}
              {indicator.points != null && ` Aporta ${indicator.points.toLocaleString("es-ES", { maximumFractionDigits: 1 })} de 20 puntos a Zone.`}
              {" "}<a href={indicator.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{indicator.source}</a> · {indicator.period}.
            </dd>
          </div>)}
        </dl>
        <p className="mb-3 text-xs leading-relaxed text-stone-600">Verde: m² totales publicados. Transporte: líneas distintas de Metro. Servicios: locales únicos de alimentación, farmacia, gimnasio u ocio. Actuaciones: suma de las cinco categorías publicadas; menos actuaciones no acredita mayor seguridad. Los periodos de las fuentes son distintos.</p>
      </details>}
      <details className={styles.details}>
        <summary>Cómo se calcula y qué aporta cada factor</summary>
        <p className="mt-2 text-xs text-stone-600">Puntos acumulados para ordenar: {score ?? 0}/100{scoring.coveragePercent < 100 ? " · evaluación incompleta" : ""}.</p>
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
