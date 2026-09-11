"use client";

import { useState } from "react";
import { results } from "./results-contract";
import styles from "./presentation.module.css";

function modelMetric(key: string, unit: string) {
  const outer = results.metrics.outer as Record<string, Record<string, unknown>> | undefined;
  const value = outer?.LightGBM?.[key];
  return results.status === "complete" && typeof value === "number" && Number.isFinite(value)
    ? `${value.toLocaleString("es-ES", { maximumFractionDigits: key === "MAE_eur" ? 0 : 2 })}${unit}`
    : "Pendiente";
}

export function PricingMethod() {
  return <div className={styles.pricingMethod}>
    <section aria-label="Modelo de pricing de 2018">
      <h3 className={styles.methodHeading}>01 <span>Modelo de pricing</span></h3>
      <div className={styles.pricingFlow}>
        <article><span className={styles.methodLabel}>Inputs</span><h4>Anuncios de Madrid · 2018</h4><p>{results.n_features} variables: superficie, localización, habitaciones, baños, planta y ascensor.</p></article>
        <article><span className={styles.methodLabel}>Modelo</span><h4>LightGBM</h4><p>Menor error que Ridge y la referencia territorial. Evaluación por activo e intervalos calibrados.</p><small>Aprende oferta histórica; precisión actual sin validar.</small></article>
        <article><span className={styles.methodLabel}>Outputs</span><h4>Precio de oferta estimado · 2018</h4><dl className={styles.pricingMetrics}><div><dt>MdAPE</dt><dd>{modelMetric("MdAPE_pct", "%")}</dd></div><div><dt>MAE</dt><dd>{modelMetric("MAE_eur", " €")}</dd></div></dl><small>Evaluación exterior agrupada · {results.model_id}</small></article>
      </div>
    </section>
    <section aria-label="Actualización macroeconómica">
      <h3 className={styles.methodHeading}>02 <span>Actualización macroeconómica</span></h3>
      <div className={styles.macroFlow}>
        <article><h4>Comprar</h4><p className={styles.methodEquation}>Precio compra 2026 = Precio compra 2018 × (IPV 2026 / IPV 2018)</p><small>Escenario del artefacto: × 1,5534 · Q1 2026. Misma serie, ámbito y base del IPV.</small></article>
        <article><h4>Alquilar <span className={styles.proposalLabel}>Propuesta</span></h4><p className={styles.methodEquation}>Precio alquiler 2026 = Precio compra 2026 × Rentabilidad anual 2026 del distrito / 12</p><small>Rentabilidad en tanto por uno. Fuente pendiente; hoy la app utiliza la renta del anuncio.</small></article>
      </div>
    </section>
  </div>;
}

const currentRows = [
  { name: "Fair", question: "¿Cómo se compara el precio?", formula: "100 / 85 / 62 / 32 / 12 puntos, según la banda de valoración", detail: "Solo cuando existe una estimación individual válida." },
  { name: "Opportunity", question: "¿Hay revalorización relativa?", formula: "Sin puntuación disponible", detail: "Faltan series comparables de zona y ciudad para el mismo periodo." },
  { name: "Zone", question: "¿Qué calidad de vida ofrece?", formula: "Sin puntuación disponible", detail: "Faltan indicadores verificables del barrio y una metodología de agregación." },
  { name: "Lifestyle", question: "¿Cuánto tardo al trabajo?", formula: "100 hasta 10 min · 100 − 1,9 × (min − 10) entre 10 y 60 min · 5 desde 60 min", detail: "Se utiliza el tiempo del modo recomendado para el perfil." },
];

const proposedRows = [
  { name: "Fair", question: "¿Está bien valorada?", formula: "Fair Gap (%) = (Precio predicho − Precio oferta) / Precio predicho × 100", detail: "Fair Score = percentil del gap en una distribución de referencia por definir." },
  { name: "Opportunity", question: "¿Es una oportunidad de inversión?", formula: "Opportunity Gap (%) = (Revalorización inmueble − Revalorización ciudad) × 100", detail: "Opportunity Score = percentil del gap. Tasas en tanto por uno y mismo periodo." },
  { name: "Zone", question: "¿Está en buena zona?", formula: "Zone Score (%) = (Σ característicaᵢ / n) × 100", detail: "Requiere características comparables entre 0 y 1, fuente y tratamiento de ausencias." },
  { name: "Lifestyle", question: "¿Cuánto tardo al trabajo?", formula: "Lifestyle Score (%) = percentil de −Tiempo al trabajo", detail: "Referencia: viviendas que pasan los filtros del usuario. Menos minutos, más puntos." },
];

export function ScoreMethod() {
  const [view, setView] = useState<"current" | "proposal">("current");
  const rows = view === "current" ? currentRows : proposedRows;
  return <div className={styles.scoreMethod} data-presentation-interactive>
    <div className={styles.methodSwitcher} role="group" aria-label="Versión del cálculo del Score">
      <button type="button" aria-pressed={view === "current"} onClick={() => setView("current")}>Cálculo actual</button>
      <button type="button" aria-pressed={view === "proposal"} onClick={() => setView("proposal")}>Propuesta v12</button>
    </div>
    <p className={styles.methodEquation}>HabitIA Score = (α × Fair + β × Opportunity + γ × Zone + δ × Lifestyle) / 100</p>
    <p className={styles.methodWeights}>Preferencias: α, β, γ, δ entre 0 y 100 · α + β + γ + δ = 100</p>
    <div aria-live="polite">
      <dl className={styles.scoreMethodRows}>{rows.map(row => <div key={row.name}>
        <dt>{row.name}<small>{row.question}</small></dt>
        <dd><strong>{row.formula}</strong><p>{row.detail}</p></dd>
      </div>)}</dl>
      <p className={styles.methodStatus}>{view === "current"
        ? "Ejemplo con pesos iguales: Fair 100 y Lifestyle 81 → Score 45/100 · datos disponibles para el 50% de tus pesos. Los pesos sin datos no se redistribuyen."
        : "Diseño de la v12, aún sin implementar. Hay que fijar referencias y empates de los percentiles fuera del test reservado del modelo."}</p>
    </div>
  </div>;
}
