"use client";

import type { ReactNode } from "react";
import predictor from "./predictor-metadata.json";
import styles from "./presentation.module.css";

function modelMetric(key: keyof typeof predictor.metricas_test, digits = 2, unit = "") {
  return `${predictor.metricas_test[key].toLocaleString("es-ES", { minimumFractionDigits: digits, maximumFractionDigits: digits })}${unit}`;
}

function Fraction({ top, bottom }: { top: ReactNode; bottom: ReactNode }) {
  return <span className={styles.fraction}><span>{top}</span><span>{bottom}</span></span>;
}

function Equation({ label, children }: { label: string; children: ReactNode }) {
  return <span className={styles.equation} role="math" aria-label={label}><span aria-hidden="true">{children}</span></span>;
}

export function ScoreEquation() {
  return <Equation label="HabitIA Score igual a alfa por Fair más beta por Opportunity más gamma por Zone más delta por Lifestyle, todo dividido entre cien">
    HabitIA Score = <Fraction top={<>α · Fair + β · Opportunity + γ · Zone + δ · Lifestyle</>} bottom="100" />
  </Equation>;
}

export function PricingMethod() {
  return <div className={styles.pricingMethod}>
    <section aria-label="Modelo de valoración">
      <h3 className={styles.methodHeading}>01 <span>Modelo de valoración</span></h3>
      <div className={styles.pricingFlow}>
        <article><span className={styles.methodLabel}>Inputs</span><h4>Dataset de {predictor.ano_base}</h4><p>Anuncios de Madrid de Idealista.</p><p>Top 5 por importancia: superficie, baños, alquiler mediano por m² del barrio, vulnerabilidad y ascensor.</p><small>De {predictor.columnas.length} variables · importancia por ganancia media (gain)</small></article>
        <article><span className={styles.methodLabel}>Modelo</span><h4>XGBoost</h4><p>Capta relaciones no lineales e interacciones entre características de la vivienda y su entorno.</p><p>Fiabilidad en el test: {modelMetric("pct_dentro_del_20pct", 2, "%")} de los anuncios con error ≤20%.</p></article>
        <article><span className={styles.methodLabel}>Outputs</span><h4>Precio de compra de {predictor.ano_base}</h4><dl className={styles.pricingMetrics}><div><dt>MdAPE</dt><dd>{modelMetric("error_pct_mediano", 2, "%")}</dd></div><div><dt>R² (log)</dt><dd>{modelMetric("r2_log", 4)}</dd></div></dl><small>Estimación del precio anunciado · métricas del test de {predictor.ano_base}</small></article>
      </div>
    </section>
    <section aria-label="Actualización macroeconómica del paquete actual">
      <h3 className={styles.methodHeading}>02 <span>Actualización macroeconómica</span></h3>
      <div className={styles.macroFlow}>
        <article><h4>Comprar · nivel de {predictor.ano_precio}</h4><div className={styles.macroEquation}><Equation label={`Precio de compra de ${predictor.ano_precio} igual al precio de ${predictor.ano_base} por el factor de venta del distrito de ${predictor.ano_base} a ${predictor.ano_precio}`}>
          P<sub>compra {predictor.ano_precio}</sub> = P<sub>compra {predictor.ano_base}</sub> · f<sub>venta distrito</sub>
        </Equation></div></article>
        <article><h4>Alquilar · escenario con ratio de {predictor.ano_renta}</h4><div className={styles.macroEquation}><Equation label={`Escenario de renta mensual igual al precio de compra de ${predictor.ano_precio} por el factor mensual de renta del distrito de ${predictor.ano_renta}`}>
          R<sub>escenario mensual</sub> = P<sub>compra {predictor.ano_precio}</sub> · f<sub>renta distrito {predictor.ano_renta}</sub>
        </Equation></div></article>
      </div>
      <p className={styles.equationKey}>f venta: factor distrital de {predictor.ano_base} a {predictor.ano_precio} · f renta: ratio mensual renta/precio de {predictor.ano_renta}. Estos resultados no son valoraciones validadas de 2026. Actualizar exige fuentes y periodos compatibles y una nueva validación.</p>
    </section>
  </div>;
}

export function PredictorDetails() {
  return <div className={styles.predictorDetails}>
    <dl className={styles.predictorMetrics}>
      <div><dt>Error porcentual mediano</dt><dd>{modelMetric("error_pct_mediano", 2, "%")}</dd><small>MdAPE · test de {predictor.ano_base}</small></div>
      <div><dt>Error absoluto medio</dt><dd>{modelMetric("error_abs_medio_eur", 0, " €")}</dd><small>MAE · test de {predictor.ano_base}</small></div>
      <div><dt>R² en logaritmos</dt><dd>{modelMetric("r2_log", 4)}</dd><small>RMSE log: {modelMetric("rmse_log", 4)}</small></div>
      <div><dt>Error dentro de ±20%</dt><dd>{modelMetric("pct_dentro_del_20pct", 2, "%")}</dd><small>Proporción observada en test</small></div>
    </dl>
    <div className={styles.predictorColumns}>
      <article><h3>Del anuncio al precio</h3>
        <p><strong>{predictor.columnas.length} variables.</strong> Superficie, habitaciones, baños y planta; equipamiento y tipología; distancias al centro, metro y Castellana; alquiler, delitos y vulnerabilidad del barrio.</p>
        <p><strong>{predictor.params.n_estimators} árboles.</strong> Profundidad máxima {predictor.params.max_depth}. Estimación del logaritmo del precio y corrección de Duan al volver a euros.</p>
        <div className={styles.predictorEquation}><Equation label="Precio de 2018 igual a la exponencial de la predicción XGBoost por el factor de corrección 1,016823">
          P<sub>{predictor.ano_base}</sub> = exp(XGBoost(x)) · {predictor.smearing.toLocaleString("es-ES", { maximumFractionDigits: 6 })}
        </Equation></div>
      </article>
      <article><h3>Ámbito y límites</h3>
        <p><strong>Madrid capital · hasta {predictor.area_max_dominio} m².</strong> Excluye casas y chalets; exige superficie, habitaciones, baños y coordenadas.</p>
        <p>No distingue estado de conservación, áticos ni vistas. Parte del equipamiento se extrae de la descripción; lo no mencionado puede perderse.</p>
        <p><strong>Sin intervalos ni SHAP exportados.</strong> Venta a nivel de {predictor.ano_precio}; alquiler derivado con ratios de {predictor.ano_renta}, sin validación propia.</p>
      </article>
    </div>
    <p className={styles.predictorSource}>Resultados declarados · {predictor.nombre} · paquete v{predictor.version_paquete}. La entrega no incluye particiones ni tamaño del test para auditar la evaluación.</p>
  </div>;
}

export function ScoreMethod() {
  return <div className={styles.scoreMethod}>
    <div className={styles.scoreSummary}><ScoreEquation /></div>
    <p className={styles.methodWeights}>Tú eliges los pesos: α, β, γ, δ entre 0 y 100 · α + β + γ + δ = 100</p>
    <dl className={styles.scoreMethodRows}>
      <div><dt>Fair<small>¿Está bien valorada?</small></dt><dd>
        <Equation label="Fair Gap en porcentaje igual al precio predicho menos el precio de oferta, dividido entre el precio predicho, por cien">Fair Gap (%) = <Fraction top="Precio predicho − Precio oferta" bottom="Precio predicho" /> · 100</Equation>
        <p className={styles.percentileEquation}>Fair Score (%) = Percentil(Fair Gap normalizado respecto a la distribución de referencia)</p>
      </dd></div>
      <div><dt>Opportunity<small>¿Es una oportunidad de inversión?</small></dt><dd>
        <Equation label="Opportunity Gap en porcentaje igual a la revalorización del inmueble menos la revalorización de la ciudad, por cien">Opportunity Gap (%) = (Revalorización inmueble − Revalorización ciudad) · 100</Equation>
        <p className={styles.percentileEquation}>Opportunity Score (%) = Percentil(Opportunity Gap normalizado respecto a la distribución de referencia)</p>
      </dd></div>
      <div><dt>Zone<small>¿Está en buena zona?</small></dt><dd>
        <Equation label="Zone Score en porcentaje igual a la suma de los n indicadores normalizados entre cero y uno, dividido entre n, por cien">Zone Score (%) = <Fraction top={<>∑<sub>i = 1</sub><sup>n</sup> indicador<sub>i</sub></>} bottom="n" /> · 100</Equation>
        <p className={styles.percentileEquation}>Indicadores entre 0 y 1: zonas verdes, seguridad, transporte, servicios y descanso.</p>
      </dd></div>
      <div><dt>Lifestyle<small>¿Cuánto tardo al trabajo?</small></dt><dd>
        <p className={styles.percentileEquation}>Lifestyle Score (%) = Percentil(−Tiempo al trabajo normalizado respecto a la distribución de pisos que pasan tus filtros)</p>
      </dd></div>
    </dl>
  </div>;
}

export function PresentationArchitecture() {
  return <div className={styles.architectureDiagram} aria-label="Arquitectura del producto">
    <div className={styles.architectureUser}><span className={styles.overline}>Usuario</span><p>Buscar <span>·</span> Conversar <span>·</span> Comparar <span>·</span> Guardar y recibir avisos</p></div>
    <div className={styles.architectureConnector} aria-hidden="true">↕</div>
    <article className={styles.architectureBackend}><span className={styles.overline}>Vercel</span><h3>Web y backend</h3><p>Next.js · panel, chat, mapa y comparador</p></article>
    <div className={styles.architectureServices}>
      <article><span className={styles.architectureConnector} aria-hidden="true">↕</span><span className={styles.overline}>Fly.io</span><h3>Modelo de precio</h3><p>Python · FastAPI · XGBoost</p><small>Precio puntual · escenario de renta</small></article>
      <article><span className={styles.architectureConnector} aria-hidden="true">↕</span><span className={styles.overline}>Supabase</span><h3>Datos y automatización</h3><p>PostgreSQL</p><small>Favoritos · historial · selección diaria</small></article>
      <article><span className={styles.architectureConnector} aria-hidden="true">↕</span><span className={styles.overline}>Anthropic</span><h3>Asistente</h3><p>Claude</p><small>Interpreta y explica</small></article>
    </div>
    <div className={styles.architectureSources}><span className={styles.overline}>Fuentes externas → backend</span><p>Idealista · anuncios <span> / </span> OpenRouteService · trayectos <span> / </span> Fuentes oficiales · contexto</p></div>
  </div>;
}
