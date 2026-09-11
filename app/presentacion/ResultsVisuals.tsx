"use client";

import { createContext, useContext, memo, useEffect, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import legacy from "./results-legacy.json";
import { results as data, formatCount } from "./results-contract";
import s from "./visuals.module.css";

const MotionPreference = createContext(false);
export const MotionPreferenceProvider = MotionPreference.Provider;

const number = (value: number, digits = 2) => value.toLocaleString("es-ES", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const percent = (value: number, digits = 2) => `${number(value, digits)} %`;

// Analytic critically damped spring. Re-targeting retains the live position and
// velocity; no queued transitions, layout animation or new animation dependency.
function SpringFill({ value, active, className = "" }: { value: number; active: boolean; className?: string }) {
  const reducedMotion = useContext(MotionPreference);
  const ref = useRef<HTMLSpanElement>(null);
  const state = useRef({ x: 0, velocity: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const run = () => {
      cancelAnimationFrame(frame);
      const target = active ? value : 0;
      if (media.matches || reducedMotion || !active) {
        state.current = { x: target, velocity: 0 };
        el.style.transform = `scaleX(${target})`;
        return;
      }
      let previous = performance.now();
      const tick = (now: number) => {
        const dt = Math.min((now - previous) / 1000, 0.05);
        previous = now;
        const { x, velocity } = state.current;
        const offset = x - target;
        const impulse = (velocity + 17 * offset) * dt;
        const decay = Math.exp(-17 * dt);
        const next = target + (offset + impulse) * decay;
        const nextVelocity = (velocity - 17 * impulse) * decay;
        state.current = { x: next, velocity: nextVelocity };
        el.style.transform = `scaleX(${next})`;
        if (Math.abs(next - target) + Math.abs(nextVelocity) > 0.0001) frame = requestAnimationFrame(tick);
        else el.style.transform = `scaleX(${target})`;
      };
      frame = requestAnimationFrame(tick);
    };
    run();
    media.addEventListener("change", run);
    return () => { cancelAnimationFrame(frame); media.removeEventListener("change", run); };
  }, [value, active, reducedMotion]);
  return <span ref={ref} className={`${s.fill} ${className}`} style={{ transform: "scaleX(0)" }} />;
}

function ChartBar({ name, value, max = 16, active, accent = false }: { name: string; value: number; max?: number; active: boolean; accent?: boolean }) {
  return <div className={`${s.barRow} ${accent ? s.accentRow : ""}`}>
    <span>{name}</span><div className={s.track} style={{"--grid-step": max === 50 ? "20%" : "25%"} as CSSProperties} aria-hidden><SpringFill value={value / max} active={active} /></div><strong>{percent(value)}</strong>
  </div>;
}

function Axis({ max, step, label }: { max: number; step: number; label: string }) {
  return <div className={s.axis} aria-hidden>{Array.from({ length: max / step + 1 }, (_, i) => <span key={i} style={{left:`${i * step / max * 100}%`}}>{i * step}{i === max / step ? label : ""}</span>)}</div>;
}

export const ModelEvidence = memo(function ModelEvidence({ active }: { active: boolean }) {
  const [mode, setMode] = useState("main");
  const rows = mode === "all" ? legacy.models : mode === "ablation" ? legacy.ablation : data.models;
  const revised = mode === "main";
  const last = data.models.find((r) => r.name === "LightGBM");
  const improvement = last && data.models[0] ? 100 * (1 - last.value / data.models[0].value) : null;
  const max = Math.max(16, Math.ceil(Math.max(0, ...rows.map((r) => r.value)) / 4) * 4);
  return <div className={s.evidence} data-active={active}>
    <div className={s.chartToolbar}><p>MdAPE · <strong>menor es mejor</strong></p><div className={s.segmented} role="group" aria-label="Vista de los resultados del modelo">
      {[['main','Evaluación revisada'],['all','Antecedentes'],['ablation','Ablación previa']].map(([id,label]) => <button type="button" key={id} aria-pressed={mode === id} onClick={() => setMode(id)}>{label}</button>)}
    </div></div>
    {rows.length ? <div className={`${s.modelChart} ${rows.length > 3 ? s.denseChart : ""}`}>
      <div className={s.rows}>{rows.map(row => <ChartBar key={row.name} {...row} max={max} active={active} accent={row.name === "LightGBM" || row.name.includes("final")} />)}</div>
      <div className={s.alignedAxis}><Axis max={max} step={max / 4} label=" %" /></div>
    </div> : <div className={s.insight}><span className={s.insightMark}>…</span><div><strong>Resultados de la revisión pendientes.</strong><p>Las cifras se cargarán del experimento terminado; no se trasladan aquí las métricas del modelo anterior.</p></div></div>}
    <div className={s.insight} aria-live="polite"><span className={s.insightMark} aria-hidden>↘</span><div><strong>{revised ? improvement == null ? "Tres referencias, una misma entrada de servicio." : `${number(improvement, 1)} % menos MdAPE frente a la referencia territorial.` : "Antecedentes exploratorios del modelo anterior."}</strong><p>{revised ? `${data.n_features} variables compartidas entre entrenamiento y servicio. Selección en grupos internos, calibración separada y evaluación exterior por activo.` : "El test anterior intervino en la selección. Estas comparaciones no son una evaluación final independiente ni describen el artefacto revisado."}</p></div></div>
    <p className={s.source}>{revised ? `${formatCount(data.sample.evaluated)} observaciones evaluadas · retrospectiva agrupada.${data.uncertainty.mdape_outer_ci95 ? ` IC descriptivo 95 % de MdAPE: ${data.uncertainty.mdape_outer_ci95.map(v=>percent(v)).join("–")}, ${data.uncertainty.bootstrap_repetitions} remuestreos por activo; no incluye toda la incertidumbre del ajuste.` : ""}` : "Modelo previo de 54 variables · modelos.json / seleccion.json · solo antecedentes."}</p>
  </div>;
});

export const DataPartition = memo(function DataPartition({ active }: { active: boolean }) {
  const [stage, setStage] = useState(2);
  const labels = ["Registros recibidos", "Ámbito documentado", "Separación por activo"];
  const total = data.sample.input;
  const valid = data.sample.eligible == null ? 0 : data.sample.eligible / total;
  const excluded = data.sample.eligible == null ? null : total - data.sample.eligible;
  return <div className={s.dataVisual} data-active={active}>
    <div className={s.stepButtons} role="group" aria-label="Etapa de preparación de datos">{labels.map((label,i)=><button type="button" key={label} aria-pressed={stage === i} onClick={()=>setStage(i)}><span>0{i+1}</span>{label}</button>)}</div>
    <div className={s.partitionNumbers}><div><span>{stage === 0 ? "Copia enriquecida" : "Registros elegibles"}</span><strong>{formatCount(stage === 0 ? total : data.sample.eligible)}</strong></div><p>{stage === 0 ? "Madrid, oferta de 2018. Precios perturbados y coordenadas desplazadas en la fuente." : stage === 1 ? "Duplicados auditados y exclusiones fijas de ámbito; sin recortar por cuantiles del precio." : "Artefacto fijo: ajuste, calibración y evaluación con activos separados. El histórico completo ya fue explorado."}</p></div>
    <div className={s.partitionTrack} aria-label={`Registros recibidos: ${total}; ajuste ${formatCount(data.sample.fit)}, calibración ${formatCount(data.sample.calibration)}, evaluación ${formatCount(data.sample.test)}`}>
      <SpringFill active={active} value={stage === 0 ? 1 : valid} className={s.validFill}/>
      <SpringFill active={active} value={stage === 2 && data.sample.fit != null ? data.sample.fit / total : 0} className={s.trainFill}/>
    </div>
    <div className={s.partitionLegend} aria-live="polite">{stage === 2 ? <><span><i className={s.trainKey}/><strong>{formatCount(data.sample.fit)}</strong> ajuste</span><span><i className={s.testKey}/><strong>{formatCount(data.sample.calibration)}</strong> calibración</span><span><i className={s.testKey}/><strong>{formatCount(data.sample.test)}</strong> evaluación</span></> : <span><i className={s.testKey}/>{stage === 0 ? "Registros, no viviendas distintas" : `${formatCount(data.sample.eligible)} elegibles`}</span>}{stage > 0 && <span><i className={s.excludedKey}/>{formatCount(excluded)} retirados</span>}</div>
    <div className={s.dataSteps}><span>Procedencia auditada</span><span>Soporte espacial</span><span>{data.n_features} variables compartidas</span><span>Faltantes explícitos</span></div>
    <p className={s.source}>El ajuste de estadísticas y la selección usan solo los subconjuntos permitidos. Separar de nuevo datos conocidos no crea un test externo virgen.</p>
  </div>;
});

export const UncertaintyEvidence = memo(function UncertaintyEvidence({ active }: { active: boolean }) {
  const [price, setPrice] = useState(250);
  const [calibrated, setCalibrated] = useState(true);
  const coverage = calibrated ? data.coverage.outer_assets : data.coverage.artifact_assets;
  const rowCoverage = calibrated ? data.coverage.outer : data.coverage.artifact;
  const halfWidth = data.coverage.width_pct == null ? 20 : 300 * data.coverage.width_pct / 200;
  const lower = 300 - halfWidth, upper = 300 + halfWidth;
  const position = (price - 100) / 4;
  const verdict = price < lower ? "Por debajo de todo el rango." : price > upper ? "Por encima de todo el rango." : "Dentro del rango estimado.";
  return <div className={s.uncertainty} data-active={active}>
    <div className={s.rangePanel}>
      <p className={s.eyebrow}>01 · Cómo leer una valoración</p>
      <div className={s.priceReadout}><span>Precio anunciado</span><output htmlFor="example-price">{number(price * 1000, 0)} €</output></div>
      <div className={s.intervalDiagram} aria-label={`Ejemplo con estimación 300.000 euros, intervalo de ${number(lower*1000,0)} a ${number(upper*1000,0)} euros`}>
        <div className={s.intervalBand} style={{left:`${(lower-100)/4}%`,width:`${(upper-lower)/4}%`}}><span>{number(lower,0)}–{number(upper,0)} mil €</span></div>
        <div className={s.estimateLine}><span>Estimación<br/><strong>300.000 €</strong></span></div>
        <div className={s.cursorRail} style={{transform:`translateX(${position}%)`}}><i /></div>
      </div>
      <div className={s.priceTicks} aria-hidden><span>100 mil €</span><span>300 mil €</span><span>500 mil €</span></div>
      <label className={s.sliderLabel} htmlFor="example-price">Mueve el precio para comparar <span aria-hidden>↔</span></label>
      <input className={s.priceSlider} id="example-price" type="range" min="100" max="500" step="5" value={price} onChange={e=>setPrice(Number(e.target.value))} aria-valuetext={`${number(price * 1000,0)} euros`} />
      <p className={s.rangeVerdict} aria-live="polite"><strong>{verdict}</strong><br/>{price < lower ? "Una señal para investigar; no una ganga garantizada." : price > upper ? "Conviene revisar qué explica ese precio." : "La diferencia, por sí sola, no señala una oportunidad."}</p>
      <p className={s.source}>Ejemplo ilustrativo simétrico, no una vivienda real. Su ancho representa la mediana observada: {data.coverage.width_pct == null ? "pendiente" : percent(data.coverage.width_pct, 1)} del precio en la evaluación revisada.</p>
    </div>
    <div className={s.coveragePanel}>
      <p className={s.eyebrow}>02 · Cómo comprobar el rango</p>
      <div className={s.segmented} role="group" aria-label="Calibración de los intervalos"><button type="button" aria-pressed={!calibrated} onClick={()=>setCalibrated(false)}>Artefacto fijo</button><button type="button" aria-pressed={calibrated} onClick={()=>setCalibrated(true)}>Evaluación exterior</button></div>
      <div className={s.coverageReadout} aria-live="polite"><strong>{coverage == null ? "Pendiente" : percent(coverage,1)}</strong><span>de activos con todos sus registros cubiertos</span></div>
      <div className={s.coverageTrack} aria-hidden><SpringFill active={active} value={(coverage ?? 0) / 100}/><i className={s.targetLine}><span>Objetivo nominal {percent(data.coverage.target,0)}</span></i></div>
      <Axis max={100} step={50} label=" %"/>
      <p className={s.coverageExplanation}>Cobertura por anuncio: {rowCoverage == null ? "pendiente" : percent(rowCoverage,1)}. La calibración usa el máximo error por activo, en un conjunto separado; no garantiza cada vivienda o segmento.</p>
      <p className={s.source}>Dos lecturas retrospectivas del mismo histórico. No son pruebas independientes ni validación de anuncios de 2026.</p>
    </div>
  </div>;
});

export const ScopeEvidence = memo(function ScopeEvidence({ active }: { active: boolean }) {
  const [folds, setFolds] = useState(false);
  const values = [{name:"Evaluación exterior",value:data.scope.outer,detail:"Tres grupos externos; selección interna"},{name:"Artefacto entregado",value:data.scope.artifact,detail:"Partición fija; no se reajusta tras medir"},{name:"Trimestre posterior",value:data.scope.temporal,detail:"Seleccionar en Q1–Q3 · evaluar Q4"}];
  const max = Math.max(25, Math.ceil(Math.max(0, ...values.map((r) => r.value ?? 0), ...data.scope.folds) / 5) * 5);
  return <div className={s.evidence} data-active={active}>
    <div className={s.chartToolbar}><p>MdAPE · <strong>tres lecturas retrospectivas</strong></p><button className={s.detailButton} type="button" aria-pressed={folds} onClick={()=>setFolds(!folds)}>{folds ? "Ocultar" : "Ver"} grupos exteriores</button></div>
    <div className={s.scopePlot}>
      {values.map((row,i)=><div key={row.name} className={`${s.scopeRow} ${i === 2 ? s.warningRow : ""}`}><div><strong>{row.name}</strong><span>{row.detail}</span></div><div className={s.scopeTrack} aria-hidden><SpringFill active={active} value={(row.value ?? 0) / max}/></div><strong>{row.value == null ? "Pendiente" : percent(row.value)}</strong></div>)}
      <div className={s.scopeAxis}><Axis max={max} step={max / 5} label=" %"/></div>
    </div>
    {folds && <p className={s.foldNote}>{data.scope.folds.length ? `MdAPE por grupo exterior: ${data.scope.folds.map(v=>percent(v)).join(" · ")}. No es un intervalo de confianza.` : "El experimento aún no ha publicado los resultados por grupo."}</p>}
    <div className={s.insight}><span className={s.insightMark} aria-hidden>↗</span><div><strong>El promedio no representa todos los segmentos.</strong><p>{data.limitations.cheap_decile_coverage_pct == null ? "Límites por segmento pendientes." : `En el 10 % de anuncios más baratos, la cobertura es ${percent(data.limitations.cheap_decile_coverage_pct)} por anuncio y el MdAPE ${percent(data.limitations.cheap_decile_mdape_pct ?? 0)}.`}{data.limitations.temporal_asset_coverage_pct != null ? ` En Q4, la cobertura por activo baja al ${percent(data.limitations.temporal_asset_coverage_pct)}.` : ""}</p></div></div>
    <p className={s.source}>{formatCount(data.sample.abstentions)} abstenciones exteriores · Q4 ya fue explorado. El salto a 2026 sigue sin validación; un índice agregado solo define un escenario.</p>
  </div>;
});

export const ExplanationEvidence = memo(function ExplanationEvidence({ active }: { active: boolean }) {
  const blocks = data.shap;
  const max = Math.max(50, Math.ceil(Math.max(0, ...blocks.map((r) => r.value)) / 10) * 10);
  return <div className={s.evidence} data-active={active}>
    <p className={s.chartToolbar}>Importancia SHAP relativa del modelo revisado; promedio de magnitudes en los grupos exteriores.</p>
    {blocks.length ? <><div className={s.rows}>{blocks.map(({name,value})=><ChartBar key={name} name={name} value={value} max={max} active={active}/>)}</div><div className={s.alignedAxis}><Axis max={max} step={max / 5} label=" %"/></div></> : <div className={s.insight}><div><strong>Explicaciones globales pendientes del experimento.</strong><p>No se reutilizan aquí las importancias del modelo anterior.</p></div></div>}
    <div className={s.insight}><span className={s.insightMark} aria-hidden>↳</span><div><strong>Explicar el cálculo no equivale a demostrar causalidad.</strong><p>Las atribuciones usan la escala logarítmica. El servicio también puede mostrar las tres contribuciones más grandes de un anuncio concreto.</p></div></div>
    <p className={s.source}>Modelo vigente: {data.model_id}. Hasta seis variables principales y resto agrupado; normalización de SHAP absoluto medio. No son porcentajes del precio.</p>
  </div>;
});

const layers = [{title:"La vivienda",copy:"Precio, características y margen de incertidumbre."},{title:"Tu entorno",copy:"Barrio, servicios y trayecto al trabajo."},{title:"Tu decisión",copy:"Preferencias, comparación y razones comprensibles."}];
export const ProductConcept = memo(function ProductConcept({ active }: { active: boolean }) {
  const [layer, setLayer] = useState(0);
  return <div className={s.concept} data-active={active}>
    <div className={s.conceptImage}><Image src="/presentacion/habitia-contexto-v1.png" alt="Maqueta conceptual de una manzana residencial: vivienda, barrio y trayecto conectados." width={1536} height={1024} sizes="(max-width: 900px) 90vw, 55vw"/><div className={s.conceptPin} style={{"--pin-x":`${[55,30,72][layer]}%`,"--pin-y":`${[58,37,81][layer]}%`} as CSSProperties}><span>0{layer+1}</span></div><span className={s.conceptCredit}>Ilustración conceptual · generada con IA</span></div>
    <div className={s.conceptLayers}><p className={s.eyebrow}>Tres escalas. Una decisión.</p>{layers.map((item,i)=><button type="button" aria-pressed={layer === i} onClick={()=>setLayer(i)} key={item.title}><span>0{i+1}</span><div><strong>{item.title}</strong><p>{item.copy}</p></div></button>)}<p className={s.conceptGoal}>El objetivo: menos tiempo comparando.<br/><strong>Más confianza al decidir.</strong></p></div>
  </div>;
});
