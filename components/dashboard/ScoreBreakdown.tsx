import type { PersonalScoring } from "@/types";
import { evaluationLabel } from "@/lib/score-presentation";
import { ZONE_INDICATOR_COUNT, ZONE_INDICATOR_POINTS } from "@/lib/neighborhood/zone-score";
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
        <div className={styles.overallMeta}>
          <strong className={styles.overallLabel}>HabitIA Score</strong>
          {scoring.coveragePercent < 100 && <span className={styles.overallStatus}>{scoring.coveragePercent > 0 ? "Evaluación parcial" : "Sin datos disponibles"}</span>}
          <span className={styles.coverage}>Datos para el {scoring.coveragePercent.toLocaleString("es-ES", { maximumFractionDigits: 1 })}% de tus pesos</span>
        </div>
        <output className={styles.overallValue} aria-label={`${evaluationLabel(scoring)}: ${scoring.coveragePercent > 0 && score != null ? `${score}/100` : "—"}`}>
          {scoring.coveragePercent > 0 && score != null ? <>{score}<span>/100</span></> : "—"}
        </output>
      </div>
      <dl className={styles.metrics} aria-label="Los cuatro subscores">
        {COMPONENTS.map(({ key, name, description }) => {
          const component = scoring.components.find((c) => c.key === key);
          const value = component?.value;
          return <div key={key} className={styles.metric}>
            <dt>{name}<span>{description}</span>{key === "zone" && scoring.zone && <span>{scoring.zone.available < ZONE_INDICATOR_COUNT ? "Parcial · " : ""}{scoring.zone.available}/{ZONE_INDICATOR_COUNT} indicadores</span>}</dt>
            <dd className={value == null ? styles.missing : undefined}>
              {value == null ? <><span aria-hidden>—</span><small>{component?.explanation.startsWith("No aplica") ? "No aplica" : "Sin dato"}</small></> : <>{value.toLocaleString("es-ES", { maximumFractionDigits: 1 })}<small>/100</small></>}
            </dd>
          </div>;
        })}
      </dl>
      {scoring.fair?.score === 0 && <p className="mt-3 text-xs leading-relaxed text-stone-600">Fair calculado: 0/100. El anuncio supera la estimación en un {scoring.fair.gapPercent.toLocaleString("es-ES", { maximumFractionDigits: 1 })}%. La escala asigna 0 puntos a partir del 20% por encima; puedes consultar los importes en el desglose.</p>}
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
        <summary>Zone · distrito de {scoring.zone.district} · {scoring.zone.available}/{ZONE_INDICATOR_COUNT} indicadores</summary>
        <p className="mt-2 text-xs leading-relaxed text-stone-600">Zone combina zonas verdes, actuaciones policiales, transporte y servicios. Cada indicador aporta hasta {ZONE_INDICATOR_POINTS} puntos, con el mismo peso. Son datos de distrito, no mediciones del barrio o la vivienda.</p>
        <dl className="my-3 space-y-3 text-xs leading-relaxed">
          {scoring.zone.indicators.map(indicator => <div key={indicator.key}>
            <dt className="font-medium">{indicator.label} · {indicator.index == null ? "Sin dato" : `${(indicator.index * 100).toLocaleString("es-ES", { maximumFractionDigits: 1 })}/100`}</dt>
            <dd className="mt-1 text-stone-600">
              {indicator.rawValue == null ? "Valor territorial pendiente." : `${indicator.rawValue.toLocaleString("es-ES", { maximumFractionDigits: 2 })} ${indicator.unit}. ${indicator.inverse ? "Menos" : "Más"} cantidad, mayor índice.`}
              {indicator.points != null && ` Aporta ${indicator.points.toLocaleString("es-ES", { maximumFractionDigits: 1 })} de ${ZONE_INDICATOR_POINTS} puntos a Zone.`}
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
