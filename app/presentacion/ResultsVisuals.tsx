"use client";

import { createContext, useContext, memo, useEffect, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import data from "./results-data.json";
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
  const rows = mode === "all" ? data.models : mode === "ablation" ? data.ablation : [data.models[0], data.models[1], data.models[6]];
  const improvement = 100 * (1 - data.models[6].value / data.models[0].value);
  return <div className={s.evidence} data-active={active}>
    <div className={s.chartToolbar}><p>Error porcentual mediano · <strong>menor es mejor</strong></p><div className={s.segmented} role="group" aria-label="Vista de los resultados del modelo">
      {[['main','El avance'],['all','7 modelos'],['ablation','La localización']].map(([id,label]) => <button type="button" key={id} aria-pressed={mode === id} onClick={() => setMode(id)}>{label}</button>)}
    </div></div>
    <div className={`${s.modelChart} ${rows.length > 3 ? s.denseChart : ""}`}>
      <div className={s.rows}>{rows.map(row => <ChartBar key={row.name} {...row} active={active} accent={row.name.includes("final")} />)}</div>
      <div className={s.alignedAxis}><Axis max={16} step={4} label=" %" /></div>
    </div>
    <div className={s.insight} aria-live="polite"><span className={s.insightMark} aria-hidden>↘</span><div><strong>{mode === "ablation" ? "El lugar también explica el precio." : mode === "all" ? "Más complejidad no siempre aporta más." : `${number(improvement, 0)} % menos error frente a la referencia del barrio.`}</strong><p>{mode === "ablation" ? "Al retirar toda la localización, el error sube de 8,20 % a 12,46 %. La ablación mide qué aporta cada grupo." : mode === "all" ? "El stacking apenas cambia el resultado. La selección final reduce variables y mejora el error hasta 8,20 %." : "De una referencia común para el barrio a una estimación que considera cada vivienda."}</p></div></div>
    <p className={s.source}>23.416 viviendas de prueba · MdAPE · resultados del TFM: modelos y selección final.</p>
  </div>;
});

export const DataPartition = memo(function DataPartition({ active }: { active: boolean }) {
  const [stage, setStage] = useState(2);
  const labels = ["Anuncios originales", "Datos depurados", "Separación por activo"];
  const total = data.sample.filas_iniciales;
  const valid = data.sample.filas_finales / total;
  return <div className={s.dataVisual} data-active={active}>
    <div className={s.stepButtons} role="group" aria-label="Etapa de preparación de datos">{labels.map((label,i)=><button type="button" key={label} aria-pressed={stage === i} onClick={()=>setStage(i)}><span>0{i+1}</span>{label}</button>)}</div>
    <div className={s.partitionNumbers}><div><span>{stage === 0 ? "Punto de partida" : "Viviendas válidas"}</span><strong>{number(stage === 0 ? total : data.sample.filas_finales,0)}</strong></div><p>{stage === 0 ? "Anuncios históricos de Madrid, 2018." : stage === 1 ? "1.233 registros descartados por falta de barrio, estructura o precios anómalos." : "El modelo aprende con el 75 % y se examina con viviendas distintas: el 25 % restante."}</p></div>
    <div className={s.partitionTrack} aria-label={stage < 2 ? `${stage === 0 ? total : data.sample.filas_finales} registros` : "70.203 de entrenamiento y 23.416 de prueba, sobre 94.852 registros originales"}>
      <SpringFill active={active} value={stage === 0 ? 1 : valid} className={s.validFill}/>
      <SpringFill active={active} value={stage === 2 ? data.sample.train / total : 0} className={s.trainFill}/>
    </div>
    <div className={s.partitionLegend} aria-live="polite">{stage === 2 ? <><span><i className={s.trainKey}/><strong>70.203</strong> entrenamiento</span><span><i className={s.testKey}/><strong>23.416</strong> prueba</span></> : <span><i className={s.testKey}/>{stage === 0 ? "100 % de los registros originales" : `${percent(valid * 100,1)} conservado`}</span>}{stage > 0 && <span><i className={s.excludedKey}/>1.233 excluidos</span>}</div>
    <div className={s.dataSteps}><span>Python + SQL</span><span>Contexto espacial</span><span>Variables comparables</span><span>Evaluación sin fugas</span></div>
    <p className={s.source}>La longitud representa registros, sobre una base de 94.852. División por activo, sin repetir viviendas entre aprendizaje y prueba.</p>
  </div>;
});

export const UncertaintyEvidence = memo(function UncertaintyEvidence({ active }: { active: boolean }) {
  const [price, setPrice] = useState(250);
  const [calibrated, setCalibrated] = useState(true);
  const coverage = calibrated ? data.coverage.cobertura_conformal_pct : data.coverage.cobertura_sin_calibrar_pct;
  const position = (price - 200) / 2;
  const verdict = price < 280 ? "Por debajo de todo el rango." : price > 320 ? "Por encima de todo el rango." : "Dentro del rango estimado.";
  return <div className={s.uncertainty} data-active={active}>
    <div className={s.rangePanel}>
      <p className={s.eyebrow}>01 · Cómo leer una valoración</p>
      <div className={s.priceReadout}><span>Precio anunciado</span><output htmlFor="example-price">{number(price * 1000, 0)} €</output></div>
      <div className={s.intervalDiagram} aria-label="Estimación 300.000 euros, intervalo de 280.000 a 320.000 euros">
        <div className={s.intervalBand}><span>280–320 mil €</span></div>
        <div className={s.estimateLine}><span>Estimación<br/><strong>300.000 €</strong></span></div>
        <div className={s.cursorRail} style={{transform:`translateX(${position}%)`}}><i /></div>
      </div>
      <div className={s.priceTicks} aria-hidden><span>200 mil €</span><span>300 mil €</span><span>400 mil €</span></div>
      <label className={s.sliderLabel} htmlFor="example-price">Mueve el precio para comparar <span aria-hidden>↔</span></label>
      <input className={s.priceSlider} id="example-price" type="range" min="200" max="400" step="5" value={price} onChange={e=>setPrice(Number(e.target.value))} aria-valuetext={`${number(price * 1000,0)} euros`} />
      <p className={s.rangeVerdict} aria-live="polite"><strong>{verdict}</strong><br/>{price < 280 ? "Una señal para investigar; no una ganga garantizada." : price > 320 ? "Conviene revisar qué explica ese precio." : "La diferencia, por sí sola, no señala una oportunidad."}</p>
      <p className={s.source}>Ejemplo ilustrativo, no es una vivienda real. El intervalo real mediano es del 52,7 % del precio.</p>
    </div>
    <div className={s.coveragePanel}>
      <p className={s.eyebrow}>02 · Cómo comprobar el rango</p>
      <div className={s.segmented} role="group" aria-label="Calibración de los intervalos"><button type="button" aria-pressed={!calibrated} onClick={()=>setCalibrated(false)}>Sin calibrar</button><button type="button" aria-pressed={calibrated} onClick={()=>setCalibrated(true)}>Con calibración</button></div>
      <div className={s.coverageReadout} aria-live="polite"><strong>{percent(coverage,1)}</strong><span>de cobertura observada</span></div>
      <div className={s.coverageTrack} aria-hidden><SpringFill active={active} value={coverage / 100}/><i className={s.targetLine}><span>Objetivo 90 %</span></i></div>
      <Axis max={100} step={50} label=" %"/>
      <p className={s.coverageExplanation}>La calibración acerca los intervalos al objetivo: que contengan el precio en aproximadamente <strong>9 de cada 10 viviendas.</strong></p>
      <p className={s.source}>Cobertura en prueba: 72,36 % → 89,77 %.<br/>No significa un 90 % de acierto en cada vivienda.</p>
    </div>
  </div>;
});

export const ScopeEvidence = memo(function ScopeEvidence({ active }: { active: boolean }) {
  const [folds, setFolds] = useState(false);
  const values = [{name:"Viviendas no vistas",value:data.scope.holdout,detail:"Dentro del mercado conocido"},{name:"Trimestre posterior",value:data.scope.temporal,detail:"Entrenar Q1–Q3 · evaluar Q4"},{name:"Barrios no vistos",value:data.scope.spatial,detail:"Media de cinco particiones espaciales"}];
  return <div className={s.evidence} data-active={active}>
    <div className={s.chartToolbar}><p>Error porcentual mediano · <strong>misma escala en las tres pruebas</strong></p><button className={s.detailButton} type="button" aria-pressed={folds} onClick={()=>setFolds(!folds)}>{folds ? "Ocultar" : "Ver"} las 5 particiones</button></div>
    <div className={s.scopePlot}>
      {values.map((row,i)=><div key={row.name} className={`${s.scopeRow} ${i === 2 ? s.warningRow : ""}`}><div><strong>{row.name}</strong><span>{row.detail}</span></div><div className={s.scopeTrack} aria-hidden><SpringFill active={active} value={row.value / 25}/>{i === 2 && folds && data.scope.folds.map((value,n)=><i className={s.foldPoint} key={n} style={{left:`${value/25*100}%`,top:`${n%2===0 ? -9 : 24}px`}} title={`Partición ${n+1}: ${percent(value)}`}/>)}</div><strong>{percent(row.value)}</strong></div>)}
      <div className={s.scopeAxis}><Axis max={25} step={5} label=" %"/></div>
    </div>
    {folds && <p className={s.foldNote}>Particiones espaciales: {data.scope.folds.map(v=>percent(v)).join(" · ")}. Los puntos son resultados individuales, no un intervalo de confianza.</p>}
    <div className={s.insight}><span className={s.insightMark} aria-hidden>↗</span><div><strong>Generalizar en el tiempo no equivale a generalizar en el espacio.</strong><p>Expandir HabitIA requiere datos y validación de cada nuevo mercado.</p></div></div>
    <p className={s.source}>Modelo final de 54 variables · resultados de selección.json. La prueba espacial utiliza cinco grupos de barrios separados.</p>
  </div>;
});

export const ExplanationEvidence = memo(function ExplanationEvidence({ active }: { active: boolean }) {
  const blocks = Object.entries(data.shap).sort((a,b)=>b[1]-a[1]);
  return <div className={s.evidence} data-active={active}>
    <p className={s.chartToolbar}>Peso relativo de la importancia SHAP, agrupado por tipo de información.</p>
    <div className={s.rows}>{blocks.map(([name,value])=><ChartBar key={name} name={name} value={value} max={50} active={active} accent={name === "Localización"}/>)}</div>
    <div className={s.alignedAxis}><Axis max={50} step={10} label=" %"/></div>
    <div className={s.insight}><span className={s.insightMark} aria-hidden>↳</span><div><strong>La vivienda y su localización concentran el 81,1 %.</strong><p>SHAP explica qué información utiliza el modelo. No mide causalidad ni cuánto subirá el precio al cambiar una característica.</p></div></div>
    <p className={s.source}>interpretabilidad.json · porcentajes redondeados; el total puede diferir de 100 %.</p>
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
