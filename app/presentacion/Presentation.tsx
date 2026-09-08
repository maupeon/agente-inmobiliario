"use client";

import {
  ArrowLeft,
  ArrowRight,
  ArrowsOut,
  ChartLineUp,
  Check,
  Database,
  Eye,
  Gauge,
  GitBranch,
  Lightbulb,
  MapPin,
  NotePencil,
  Pause,
  Play,
  ShieldCheck,
  Sparkle,
  Timer,
  X,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Logo } from "@/components/ui/Logo";
import styles from "./presentation.module.css";

const TOTAL_SECONDS = 10 * 60;

type CourseState = "applied" | "decision";

interface CourseGroup {
  label: string;
  courses: Array<{ name: string; state: CourseState }>;
}

interface SceneDefinition {
  kicker: string;
  title: string;
  target: number;
  note: string;
}

const SCENES: SceneDefinition[] = [
  {
    kicker: "Apertura",
    title: "HabitIA",
    target: 54,
    note:
      "Deja que el vídeo plantee la promesa de producto. Al terminar: «Lo que acabamos de ver no es una maqueta. Detrás hay un problema de medición, un modelo validado y una aplicación desplegada».",
  },
  {
    kicker: "Problema",
    title: "Buscar agota. Decidir exige contexto.",
    target: 79,
    note: "La oferta está fragmentada, comparar exige tiempo y una misma vivienda depende de muchos factores. El borrador incluye cifras de mercado sin fuente completa; aquí explicamos el problema sin convertirlas en evidencia. La oportunidad es conectar anuncios, contexto y preferencias.",
  },
  {
    kicker: "Oportunidad · solución",
    title: "De buscar viviendas a tomar decisiones.",
    target: 104,
    note: "Recorre el antes y el después: portales, comparación manual e incertidumbre se convierten en perfil, datos, ranking y explicación. Ahorrar tiempo y decidir con más confianza son objetivos del producto, todavía no resultados medidos con usuarios.",
  },
  {
    kicker: "Propuesta de valor",
    title: "Seis capacidades. Una decisión.",
    target: 129,
    note: "La ventaja propuesta está en combinar las capas. Hoy se integra Idealista con fuentes de contexto, scoring y conversación. La integración multiportal y las alertas personales son evolución prevista; no confundir el refresco de datos de mercado con un workflow de búsqueda por usuario.",
  },
  {
    kicker: "Problema y propuesta",
    title: "Tres preguntas, no una media",
    target: 149,
    note:
      "El comprador solo ve el promedio de una zona, aunque dos pisos del mismo barrio puedan ser radicalmente distintos. HabitIA responde tres preguntas encadenadas: precio justo, confianza y oportunidad. Cada una requiere una técnica distinta.",
  },
  {
    kicker: "Aplicación del máster",
    title: "22 asignaturas, una cadena de decisión",
    target: 179,
    note:
      "No intentamos marcar veintidós casillas. Organizamos lo aprendido en cuatro capas: ingeniería, modelización, IA y producto. También justificamos qué no usar: 94.000 filas tabulares no necesitaban Spark, una RNN ni deep learning; y la persistencia relacional favorecía PostgreSQL frente a NoSQL.",
  },
  {
    kicker: "Metodología · datos",
    title: "Del anuncio sucio a una matriz fiable",
    target: 214,
    note:
      "Partimos de 94.852 anuncios reales. Los cruzamos espacialmente con 2.440 secciones censales, depuramos anomalías, construimos variables y dejamos 93.619 viviendas. La partición por activo produce 70.203 filas de entrenamiento y 23.416 de prueba sin valores ausentes.",
  },
  {
    kicker: "Metodología · validación",
    title: "Diseñamos cómo fallar antes de entrenar",
    target: 249,
    note:
      "La parte más importante fue evitar resultados artificialmente buenos. Excluimos variables derivadas del precio, agrupamos por activo, calculamos las codificaciones fuera de muestra y añadimos dos pruebas adversas: futuro no visto y barrios completos no vistos.",
  },
  {
    kicker: "Metodología · modelización",
    title: "Cada modelo tuvo que justificar su complejidad",
    target: 294,
    note:
      "Construimos una escalera desde la regla del sector hasta LightGBM y stacking. El gran salto viene de los datos y del primer modelo multivariante; el apilamiento aporta centésimas. La ablación revela que la localización vale 4,25 puntos, pero nuestras codificaciones construidas perjudican. Por eso producimos el modelo más simple: 54 variables y 8,20 %.",
  },
  {
    kicker: "Metodología · incertidumbre",
    title: "Un número no basta: hace falta un rango honesto",
    target: 324,
    note:
      "Entrenamos tres LightGBM cuantílicos y reservamos un 20 % del entrenamiento para conformalizar. La cobertura pasa de 72,4 % a 89,8 %, prácticamente el 90 % nominal. SHAP explica cada predicción y el intervalo impide llamar ganga a un caso donde el modelo simplemente duda.",
  },
  {
    kicker: "Resultados · predicción",
    title: "Precisión útil, no universal",
    target: 354,
    note:
      "En activos nunca vistos reducimos el error mediano del 15,4 al 8,20 %, un 47 %. El 57,6 % queda dentro de más o menos 10 %. En el futuro inmediato el error sube solo a 9,72 %. Pero al ocultar barrios completos llega a 19,86 %: el modelo no debe desplegarse en ciudades sin datos locales.",
  },
  {
    kicker: "Resultados · decisión",
    title: "Barato no es lo mismo que infravalorado",
    target: 384,
    note:
      "Definimos oportunidad solo cuando el anuncio cae por debajo del intervalo. Detectamos 1.271 casos, con 28 % de descuento y 60.106 euros de ahorro mediano. La regla ingenua de menor precio por metro cuadrado concentra el 71,7 % en tres distritos. La nuestra mantiene diversidad y, controlando por distrito, gana 2,06 puntos de rentabilidad en 19 de 19 distritos.",
  },
  {
    kicker: "Motor de recomendación",
    title: "El mejor piso depende de ti.",
    target: 419,
    note: "El flujo real pide hasta ocho candidatos, los enriquece y devuelve hasta cinco. El score es una media ponderada de precio, presupuesto, trayecto, seguridad, calidad de vida e imprescindibles. Las prioridades ajustan pesos; sin destino laboral no puntúa el trayecto. Fair, Zone y Opportunity son las tres lentes conceptuales del documento, no tres subíndices que el código sume.",
  },
  {
    kicker: "Comprar vs. alquilar",
    title: "Compara tu patrimonio. No solo la cuota.",
    target: 459,
    note: "La calculadora ya existe. Ambos escenarios parten del mismo capital e invierten la diferencia de gasto. Incluye hipoteca, impuestos, comunidad, IBI, mantenimiento, alquiler, inflación, inversión y revalorización. El horizonte, la movilidad y la situación laboral contextualizan la decisión. Son escenarios sujetos a supuestos, no una predicción garantizada.",
  },
  {
    kicker: "Innovación y producto",
    title: "El modelo no vive en un cuaderno",
    target: 489,
    note:
      "La innovación no es solo el algoritmo: es la unión de modelo puntual, intervalo y agente. Ocho herramientas orquestan datos en vivo, valoración por lotes, trayecto y barrio. SSE permite respuesta progresiva; Supabase aporta persistencia y trazabilidad; y la degradación elegante evita inventar datos cuando falla una fuente.",
  },
  {
    kicker: "Demo",
    title: "Del perfil al porqué, en directo.",
    target: 549,
    note: "Abre el panel en otra pestaña y muestra un perfil, el ranking y la explicación de una vivienda. Después cambia el horizonte en comprar o alquilar. Las fuentes en vivo pueden no estar disponibles; explica las limitaciones que muestre la aplicación. Vuelve a esta pestaña para continuar.",
  },
  {
    kicker: "Roadmap",
    title: "Demostrar. Validar. Escalar.",
    target: 579,
    note: "El borrador sitúa comprar o alquilar en el MVP, pero el repositorio ya contiene el módulo. Presentamos el estado actualizado: prototipo disponible; validación con usuarios, multiportal y alertas como siguiente fase; más ciudades, B2B, visita 2D a 3D y predicción de revalorización como visión sin fecha comprometida.",
  },
  {
    kicker: "Conclusión",
    title: "De incertidumbre a una decisión defendible",
    target: 600,
    note:
      "Cierra con cuatro ideas: 47 % menos error; la ubicación cuantificada; un rango con cobertura del 90 %; y una señal económica validada. Reconoce dos límites: datos de 2018 renivelados con el IPV y mala extrapolación geográfica. Gracias.",
  },
];

const COURSE_GROUPS: CourseGroup[] = [
  {
    label: "Ingeniería",
    courses: [
      { name: "Linux / Git", state: "applied" },
      { name: "SQL", state: "applied" },
      { name: "Python", state: "applied" },
      { name: "NoSQL", state: "decision" },
      { name: "Big Data", state: "applied" },
      { name: "Productivización", state: "applied" },
      { name: "Spark", state: "decision" },
    ],
  },
  {
    label: "Datos y modelos",
    courses: [
      { name: "Estadística", state: "applied" },
      { name: "Minería I", state: "applied" },
      { name: "Minería II", state: "applied" },
      { name: "Minería III", state: "applied" },
      { name: "Machine Learning I", state: "applied" },
      { name: "Machine Learning II", state: "applied" },
      { name: "Machine Learning III", state: "applied" },
      { name: "Machine Learning IV", state: "applied" },
    ],
  },
  {
    label: "IA",
    courses: [
      { name: "Deep learning", state: "decision" },
      { name: "RNN", state: "decision" },
      { name: "NLP", state: "applied" },
      { name: "Modelos generativos", state: "applied" },
    ],
  },
  {
    label: "Producto",
    courses: [
      { name: "BI", state: "applied" },
      { name: "Visualización avanzada", state: "applied" },
      { name: "Data science aplicada", state: "applied" },
    ],
  },
];

const MODEL_STEPS = [
  { label: "Referencia de barrio", value: 15.4, tone: "baseline" },
  { label: "Ridge hedónico", value: 10.94, tone: "middle" },
  { label: "Random Forest", value: 8.65, tone: "middle" },
  { label: "XGBoost", value: 8.71, tone: "middle" },
  { label: "LightGBM ajustado", value: 8.45, tone: "middle" },
  { label: "Stacking", value: 8.44, tone: "middle" },
  { label: "LightGBM final", value: 8.2, tone: "final" },
] as const;

function formatClock(seconds: number) {
  const safe = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safe / 60);
  const remainder = safe % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function usePresentationTimer() {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const startedAtRef = useRef(0);
  const accumulatedRef = useRef(0);

  useEffect(() => {
    if (!running) return;
    let frame = 0;
    const tick = (now: number) => {
      setElapsed((accumulatedRef.current + now - startedAtRef.current) / 1000);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running]);

  const start = useCallback(() => {
    if (running) return;
    startedAtRef.current = performance.now();
    setRunning(true);
  }, [running]);

  const pause = useCallback(() => {
    if (!running) return;
    accumulatedRef.current += performance.now() - startedAtRef.current;
    setRunning(false);
  }, [running]);

  const resetAndStart = useCallback(() => {
    accumulatedRef.current = 0;
    startedAtRef.current = performance.now();
    setElapsed(0);
    setRunning(true);
  }, []);

  return { elapsed, running, start, pause, resetAndStart };
}

export function Presentation() {
  const [active, setActive] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [started, setStarted] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [chromeVisible, setChromeVisible] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const shortcutRef = useRef({ key: "", at: 0 });
  const {
    elapsed,
    running,
    start: startTimer,
    pause: pauseTimer,
    resetAndStart,
  } = usePresentationTimer();

  const goTo = useCallback(
    (index: number) => {
      const next = Math.max(0, Math.min(SCENES.length - 1, index));
      if (next === active) return;
      setDirection(next > active ? 1 : -1);
      setActive(next);
      if (!started) {
        setStarted(true);
        startTimer();
      }
    },
    [active, started, startTimer]
  );

  const begin = useCallback(() => {
    setStarted(true);
    resetAndStart();
    void videoRef.current?.play();
  }, [resetAndStart]);

  const next = useCallback(() => goTo(active + 1), [active, goTo]);
  const previous = useCallback(() => goTo(active - 1), [active, goTo]);

  const togglePause = useCallback(() => {
    if (running) pauseTimer();
    else startTimer();
  }, [pauseTimer, running, startTimer]);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen();
  }, []);

  useEffect(() => {
    if (active !== 0) videoRef.current?.pause();
  }, [active]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      const target = event.target as HTMLElement | null;
      const isEditable = target?.closest("input, textarea, select, [contenteditable='true']");
      const shortcut = event.key.toLowerCase();

      if (["n", "f", "p", "h"].includes(shortcut)) {
        const now = performance.now();
        if (shortcutRef.current.key === shortcut && now - shortcutRef.current.at < 450) return;
        shortcutRef.current = { key: shortcut, at: now };
      }

      if (event.key === "Escape" && notesOpen) {
        event.preventDefault();
        setNotesOpen(false);
        return;
      }
      if (isEditable || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === " " && target?.closest("button, a, video")) return;

      if (event.key === "ArrowRight" || event.key === "PageDown") {
        event.preventDefault();
        next();
      } else if (event.key === "ArrowLeft" || event.key === "PageUp") {
        event.preventDefault();
        previous();
      } else if (event.key === " " && active === 0 && !started) {
        event.preventDefault();
        begin();
      } else if (event.key === " ") {
        event.preventDefault();
        next();
      } else if (event.key === "Home") {
        event.preventDefault();
        goTo(0);
      } else if (event.key === "End") {
        event.preventDefault();
        goTo(SCENES.length - 1);
      } else if (event.key.toLowerCase() === "n") {
        setNotesOpen((value) => !value);
      } else if (event.key.toLowerCase() === "f") {
        toggleFullscreen();
      } else if (event.key.toLowerCase() === "p") {
        togglePause();
      } else if (event.key.toLowerCase() === "h") {
        setChromeVisible((value) => !value);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active, begin, goTo, next, notesOpen, previous, started, toggleFullscreen, togglePause]);

  const remaining = TOTAL_SECONDS - elapsed;
  const progress = Math.min(100, (elapsed / TOTAL_SECONDS) * 100);
  const segmentStart = active === 0 ? 0 : SCENES[active - 1].target;
  const segmentDuration = SCENES[active].target - segmentStart;
  const paceDelta = elapsed - SCENES[active].target;

  const sceneState = useMemo(
    () => (index: number) => {
      if (index === active) return styles.sceneActive;
      const isPast = direction === 1 ? index < active : index <= active;
      return isPast ? styles.scenePast : styles.sceneFuture;
    },
    [active, direction]
  );

  return (
    <main className={styles.presentation} data-started={started} data-active={active} data-closing={active === SCENES.length - 1}>
      <a className={styles.skipLink} href="#presentation-controls">
        Ir a los controles
      </a>

      <div className={styles.ambient} aria-hidden>
        <span />
        <span />
      </div>

      <div className={styles.sceneStack} aria-live="polite">
        <SceneShell index={0} active={active} state={sceneState(0)} label="Vídeo promocional">
          <section className={`${styles.videoScene} ${styles.sceneCanvas}`}>
            <video
              ref={videoRef}
              className={styles.heroVideo}
              poster="/presentacion/habitia-poster.jpg"
              preload="metadata"
              playsInline
              controls={started && active === 0}
              onEnded={next}
            >
              <source src="/presentacion/habitia-promo.mp4" type="video/mp4" />
              Tu navegador no puede reproducir el vídeo promocional.
            </video>
            <div className={styles.videoShade} aria-hidden />
            <div
              className={`${styles.opening} ${started ? styles.openingHidden : ""}`}
              aria-hidden={started}
              ref={(element) => { if (element) element.inert = started; }}
            >
              <div className={styles.openingMeta}>
                <Logo
                  variant="inline"
                  className={styles.openingLogo}
                  highlightClassName={styles.openingLogoAccent}
                />
                <span>Trabajo Fin de Máster · UCM</span>
              </div>
              <div>
                <p className={styles.kickerLight}>Defensa · 10 minutos</p>
                <h1 className={styles.openingTitle}>
                  Inteligencia inmobiliaria.
                  <br />
                  Decisiones explicables.
                </h1>
                <p className={styles.openingSubtitle}>Datos + scoring + IA conversacional</p>
                <p className={styles.openingByline}>
                  Mauricio Peón García · João Paulo Nogueira Cunha · Manuel Macedo Púlido
                  <br />
                  Aldo Mauricio Ress Villets · Tomás Pérales Lara
                </p>
              </div>
              <button type="button" className={styles.beginButton} onClick={begin}>
                <Play aria-hidden weight="fill" size={18} />
                Comenzar presentación
                <span>54 s</span>
              </button>
            </div>
          </section>
        </SceneShell>

        <SceneShell index={1} active={active} state={sceneState(1)} label={SCENES[1].title}>
          <section className={styles.sceneCanvas}>
            <SceneHeader kicker="El problema" title="Buscar agota. Decidir exige contexto." />

            <div className={styles.problemLayout}>
              <div className={styles.editorialLead}><span className={styles.overline}>La oportunidad</span><h3>Más anuncios.<br /><em>Menos claridad.</em></h3><p>La información existe. Falta conectarla con la vida de quien busca.</p></div>
              <div className={styles.editorialRows}>
                {[
                  ["01", "Oferta fragmentada", "Saltar entre portales, repetir filtros y comparar anuncios."],
                  ["02", "Demasiadas variables", "Precio, estado, barrio, trayecto y financiación compiten por tu atención."],
                  ["03", "Referencias incompletas", "El precio anunciado no explica cuánto encaja una vivienda."],
                  ["04", "Tiempo e incertidumbre", "Encontrar opciones es solo el comienzo de la decisión."],
                ].map(([n, title, copy]) => <article key={n}><span>{n}</span><div><h3>{title}</h3><p>{copy}</p></div></article>)}
              </div>
            </div>
          </section>
        </SceneShell>

        <SceneShell index={2} active={active} state={sceneState(2)} label={SCENES[2].title}>
          <section className={styles.sceneCanvas}>
            <SceneHeader kicker="Oportunidad · solución" title="De buscar viviendas a tomar decisiones." />

            <div className={styles.comparisonGrid}>
              <article><span className={styles.overline}>Hoy</span><h3>Todo por conectar.</h3><ul><li>Buscar en varios portales</li><li>Comparar manualmente</li><li>Interpretar el precio sin contexto</li><li>Decidir con dudas</li></ul></article>
              <article className={styles.greenPanel}><span className={styles.overline}>Con HabitIA</span><h3>Un criterio compartido.</h3><ol><li>Tu perfil y tus prioridades</li><li>Datos + scoring + IA</li><li>Ranking personalizado</li><li>Una recomendación explicable</li></ol></article>
            </div>
            <p className={styles.takeaway}>El objetivo: <strong>menos tiempo comparando, más confianza al decidir.</strong></p>
          </section>
        </SceneShell>

        <SceneShell index={3} active={active} state={sceneState(3)} label={SCENES[3].title}>
          <section className={styles.sceneCanvas}>
            <SceneHeader kicker="Propuesta de valor 360º" title="Seis capacidades. Una decisión." />

            <div className={styles.valueGrid}>
              {[
                ["01", "Centraliza", "Anuncios y contexto en un punto de entrada."],
                ["02", "Agiliza", "Prioriza opciones relevantes para tu búsqueda."],
                ["03", "Entiende", "Convierte preferencias en criterios comparables."],
                ["04", "Explica", "Hace visible el porqué de cada recomendación."],
                ["05", "Anticipa", "Detecta oportunidades; alertas personales como siguiente paso."],
                ["06", "Personaliza", "Adapta el ranking a lo que te importa."],
              ].map(([n, title, copy]) => <article key={n}><span>{n}</span><h3>{title}</h3><p>{copy}</p></article>)}
            </div>
            <p className={styles.takeaway}>La ventaja está en <strong>combinar datos, valoración y conversación.</strong></p>
          </section>
        </SceneShell>

        <SceneShell index={4} active={active} state={sceneState(4)} label={SCENES[4].title}>
          <section className={`${styles.sceneCanvas} ${styles.thesisScene}`}>
            <SceneHeader kicker="El problema" title="El mercado da una media. HabitIA responde tres preguntas." />
            <div className={styles.thesisGrid}>
              <div className={`${styles.marketProblem} ${styles.reveal}`} style={{ "--i": 0 } as React.CSSProperties}>
                <span className={styles.overline}>Dentro del mismo barrio</span>
                <strong>30,5 %</strong>
                <p>de horquilla en €/m² para el 50 % central de los anuncios.</p>
                <div className={styles.rangeGraphic} aria-label="Horquilla del 30,5 por ciento">
                  <span />
                  <i />
                  <span />
                </div>
                <small>Una media no explica un piso concreto.</small>
              </div>
              <ol className={styles.questionList}>
                {[
                  ["01", "¿Cuánto vale?", "Predicción puntual", "LightGBM sobre 54 variables"],
                  ["02", "¿Cuánta confianza merece?", "Intervalo al 90 %", "Regresión cuantílica + CQR"],
                  ["03", "¿Es una oportunidad?", "Decisión explicada", "Contraste + valores SHAP"],
                ].map(([n, question, output, method], index) => (
                  <li key={n} className={styles.reveal} style={{ "--i": index + 1 } as React.CSSProperties}>
                    <span>{n}</span>
                    <div>
                      <h3>{question}</h3>
                      <p>{output}</p>
                    </div>
                    <small>{method}</small>
                  </li>
                ))}
              </ol>
            </div>
            <CourseLine courses="Estadística · Minería de datos · Machine Learning · Data science aplicada" />
          </section>
        </SceneShell>

        <SceneShell index={5} active={active} state={sceneState(5)} label={SCENES[5].title}>
          <section className={`${styles.sceneCanvas} ${styles.curriculumScene}`}>
            <SceneHeader kicker="Criterio 1 · aplicación del máster" title="22 asignaturas. Una sola cadena de decisión." />
            <div className={styles.curriculumGrid}>
              {COURSE_GROUPS.map((group, groupIndex) => (
                <div
                  key={group.label}
                  className={`${styles.courseGroup} ${styles.reveal}`}
                  style={{ "--i": groupIndex } as React.CSSProperties}
                >
                  <span className={styles.courseGroupNumber}>0{groupIndex + 1}</span>
                  <h3>{group.label}</h3>
                  <div className={styles.courseCloud}>
                    {group.courses.map((course) => (
                      <span
                        key={course.name}
                        className={course.state === "decision" ? styles.courseDecision : styles.courseApplied}
                      >
                        {course.name}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className={styles.curriculumFooter}>
              <div className={styles.legend}>
                <span><i className={styles.legendApplied} /> Aplicación directa</span>
                <span><i className={styles.legendDecision} /> Decisión técnica justificada</span>
              </div>
              <p>
                <strong>No usar también es método.</strong> Datos tabulares y 94k filas no justificaban
                Spark, RNN o deep learning; PostgreSQL encajaba mejor que NoSQL.
              </p>
            </div>
          </section>
        </SceneShell>

        <SceneShell index={6} active={active} state={sceneState(6)} label={SCENES[6].title}>
          <section className={`${styles.sceneCanvas} ${styles.pipelineScene}`}>
            <SceneHeader kicker="Metodología · obtención y preparación" title="Del anuncio sucio a una matriz fiable." />
            <div className={styles.pipeline}>
              <PipelineStep index="01" value="94.852" label="anuncios reales" detail="Idealista18 · Madrid · 4 trimestres" icon={<Database />} />
              <PipelineStep index="02" value="2.440" label="secciones censales" detail="Join espacial INE + alquiler MITMA" icon={<MapPin />} />
              <PipelineStep index="03" value="93.619" label="viviendas válidas" detail="Reglas de calidad y alcance declarado" icon={<ShieldCheck />} />
              <PipelineStep index="04" value="58" label="variables candidatas" detail="41 útiles + 17 construidas" icon={<GitBranch />} />
            </div>
            <div className={styles.pipelineProof}>
              <div>
                <span>Partición final</span>
                <strong>70.203 <small>train</small></strong>
                <strong>23.416 <small>test</small></strong>
              </div>
              <ul>
                <li><Check aria-hidden /> Target encoding K-fold fuera de muestra</li>
                <li><Check aria-hidden /> Proyección geográfica y distancias en km</li>
                <li><Check aria-hidden /> log(precio) + corrección de Duan</li>
                <li><Check aria-hidden /> Cero valores ausentes</li>
              </ul>
            </div>
            <CourseLine courses="Python · SQL · Estadística · Minería de datos espacial · Big Data" />
          </section>
        </SceneShell>

        <SceneShell index={7} active={active} state={sceneState(7)} label={SCENES[7].title}>
          <section className={`${styles.sceneCanvas} ${styles.validationScene}`}>
            <SceneHeader kicker="Metodología · diseño experimental" title="Diseñamos cómo fallar antes de entrenar." />
            <div className={styles.validationGrid}>
              {[
                ["Identificador", "El mismo activo aparece en train y test", "Group split sobre ASSETID", "75 / 25"],
                ["Variable derivada", "UNITPRICE contiene el objetivo", "3 variables excluidas", "sin fuga"],
                ["Tiempo", "Entrenar con el futuro", "Q1–Q3 → Q4", "0 IDs comunes"],
                ["Geografía", "Memorizar barrios", "GroupKFold por barrio", "5 bloques"],
              ].map(([risk, symptom, control, proof], index) => (
                <article key={risk} className={styles.reveal} style={{ "--i": index } as React.CSSProperties}>
                  <span className={styles.riskIndex}>0{index + 1}</span>
                  <div>
                    <p>Riesgo · {risk}</p>
                    <h3>{symptom}</h3>
                  </div>
                  <ArrowRight aria-hidden />
                  <div>
                    <p>Control</p>
                    <h3>{control}</h3>
                  </div>
                  <strong>{proof}</strong>
                </article>
              ))}
            </div>
            <div className={styles.metricRail}>
              <span>Métrica de decisión</span>
              <strong>MdAPE</strong>
              <i />
              <span>Lectura de producto</span>
              <strong>±10 %</strong>
              <i />
              <span>Control</span>
              <strong>MAE · R² log</strong>
            </div>
            <CourseLine courses="Estadística · Machine Learning I–IV · Minería de datos" />
          </section>
        </SceneShell>

        <SceneShell index={8} active={active} state={sceneState(8)} label={SCENES[8].title}>
          <section className={`${styles.sceneCanvas} ${styles.modelsScene}`}>
            <SceneHeader kicker="Metodología · comparación y ablación" title="Cada modelo tuvo que justificar su complejidad." />
            <div className={styles.modelsGrid}>
              <div className={styles.modelLadder}>
                <div className={styles.ladderHeader}><span>Modelo</span><span>MdAPE · menor es mejor</span></div>
                {MODEL_STEPS.map((model, index) => (
                  <div
                    key={model.label}
                    className={`${styles.modelRow} ${styles.reveal}`}
                    data-tone={model.tone}
                    style={{ "--i": index, "--bar": `${(model.value / 15.4) * 100}%` } as React.CSSProperties}
                  >
                    <span>{model.label}</span>
                    <div><i /></div>
                    <strong>{model.value.toFixed(2).replace(".", ",")} %</strong>
                  </div>
                ))}
              </div>
              <div className={styles.ablationStory}>
                <div className={styles.ablationLead}>
                  <span>Ablación controlada</span>
                  <strong>4,25</strong>
                  <p>puntos de MdAPE vale la localización.</p>
                </div>
                <div className={styles.ablationFinding}>
                  <Lightbulb aria-hidden />
                  <div>
                    <strong>El resultado que no esperábamos</strong>
                    <p>Las codificaciones espaciales construidas empeoran 0,25 puntos.</p>
                  </div>
                </div>
                <p className={styles.productionChoice}>
                  Producción: <strong>LightGBM · 54 variables · 8,20 %</strong>
                  <small>Cuatro variables menos. Mejor error. Menos mantenimiento.</small>
                </p>
              </div>
            </div>
            <CourseLine courses="Regresión · Random Forest · Gradient Boosting · XGBoost · LightGBM · Stacking" />
          </section>
        </SceneShell>

        <SceneShell index={9} active={active} state={sceneState(9)} label={SCENES[9].title}>
          <section className={`${styles.sceneCanvas} ${styles.uncertaintyScene}`}>
            <SceneHeader kicker="Metodología · incertidumbre e interpretabilidad" title="Un número no basta. Hace falta un rango honesto." />
            <div className={styles.uncertaintyGrid}>
              <div className={styles.intervalVisual}>
                <div className={styles.intervalLabels}><span>Límite inferior</span><span>Precio justo</span><span>Límite superior</span></div>
                <div className={styles.intervalTrack}>
                  <span className={styles.intervalBand} />
                  <span className={styles.intervalLow} />
                  <span className={styles.intervalFair}><i>Predicción</i></span>
                  <span className={styles.intervalHigh} />
                  <span className={styles.intervalListing}><i>anuncio</i></span>
                </div>
                <p>Solo hay <strong>oportunidad</strong> si el anuncio cae por debajo del intervalo.</p>
              </div>
              <ol className={styles.uncertaintySteps}>
                <li><span>01</span><div><strong>Regresión cuantílica</strong><p>LightGBM en q05, q50 y q95.</p></div></li>
                <li><span>02</span><div><strong>Calibración separada</strong><p>20 % del train que los modelos no ven.</p></div></li>
                <li><span>03</span><div><strong>Conformalización CQR</strong><p>Cobertura real: 72,4 % → <b>89,8 %</b>.</p></div></li>
              </ol>
            </div>
            <div className={styles.explainRail}>
              <Eye aria-hidden />
              <strong>SHAP explica cada caso</strong>
              <span>+</span>
              <Gauge aria-hidden />
              <strong>el intervalo explica cuándo no confiar</strong>
            </div>
            <CourseLine courses="Estadística · Machine Learning · Interpretabilidad · Visualización" />
          </section>
        </SceneShell>

        <SceneShell index={10} active={active} state={sceneState(10)} label={SCENES[10].title}>
          <section className={`${styles.sceneCanvas} ${styles.resultsScene}`}>
            <SceneHeader kicker="Resultados · activos nunca vistos" title="Precisión útil. No universal." />
            <div className={styles.resultHero}>
              <div className={styles.errorDrop}>
                <span className={styles.resultLabel}>MdAPE</span>
                <div className={styles.errorScale}>
                  <span style={{ left: "77%" }}><i />15,40 %<small>regla del sector</small></span>
                  <span className={styles.errorFinal} style={{ left: "41%" }}><i />8,20 %<small>HabitIA</small></span>
                </div>
                <strong>−47 % <small>de error</small></strong>
              </div>
              <div className={styles.resultProofs}>
                <div><strong>57,6 %</strong><p>dentro de ±10 %</p></div>
                <div><strong>9,72 %</strong><p>MdAPE en Q4 no visto</p></div>
                <div className={styles.warningResult}><strong>19,86 %</strong><p>en barrios no vistos</p></div>
              </div>
            </div>
            <div className={styles.honestyLine}>
              <ShieldCheck aria-hidden />
              <p><strong>Conclusión de alcance:</strong> robusto en el tiempo inmediato; no extrapola a mercados sin datos locales.</p>
            </div>
            <CourseLine courses="Validación por grupos · Holdout temporal · Robustez geográfica · MdAPE" />
          </section>
        </SceneShell>

        <SceneShell index={11} active={active} state={sceneState(11)} label={SCENES[11].title}>
          <section className={`${styles.sceneCanvas} ${styles.economicScene}`}>
            <SceneHeader kicker="Resultados · validación económica" title="Barato no es lo mismo que infravalorado." />
            <div className={styles.economicGrid}>
              <div className={styles.opportunityCount}>
                <span>Señal sobre el mercado</span>
                <strong>1.271</strong>
                <p>oportunidades · 5,4 % de los activos</p>
                <div className={styles.dotField} aria-hidden>
                  {Array.from({ length: 48 }).map((_, index) => <i key={index} className={index < 3 ? styles.dotHot : ""} />)}
                </div>
              </div>
              <div className={styles.economicFindings}>
                <div><span>Descuento mediano</span><strong>−28 %</strong></div>
                <div><span>Ahorro mediano</span><strong>60.106 €</strong></div>
                <div><span>Rentabilidad intradistrito</span><strong>+2,06 pp</strong><small>19 de 19 distritos · p = 1,9 × 10⁻⁶</small></div>
              </div>
            </div>
            <div className={styles.naiveComparison}>
              <span>La regla ingenua «menor €/m²»</span>
              <div><i style={{ width: "71.7%" }} /><strong>71,7 %</strong></div>
              <p>de su selección cae en solo tres distritos: no encuentra gangas, cambia de barrio.</p>
            </div>
            <CourseLine courses="Contraste de hipótesis · Segmentación · Economía espacial · Data science aplicada" />
          </section>
        </SceneShell>

        <SceneShell index={12} active={active} state={sceneState(12)} label={SCENES[12].title}>
          <section className={styles.sceneCanvas}>
            <SceneHeader kicker="Motor de recomendación" title="El mejor piso depende de ti." />

            <ol className={styles.journey}>
              {["Tu perfil", "Filtrado en Idealista", "Scoring personalizado", "Hasta 5 recomendaciones"].map((step, i) => <li key={step}><span>0{i + 1}</span><strong>{step}</strong></li>)}
            </ol>
            <div className={styles.scoreLayout}>
              <div className={styles.scoreHero}><span>HabitIA Score</span><strong>0–100</strong><p>Precio · presupuesto · trayecto · seguridad · calidad de vida · imprescindibles</p><small>Media ponderada; los pesos cambian con tus prioridades.</small></div>
              <div className={styles.editorialRows}>
                {[["Fair Score", "¿Está bien valorada?", "Precio frente a su referencia."], ["Zone Score", "¿Encaja la zona?", "Entorno y conexiones para tu día a día."], ["Opportunity Score", "¿Hay oportunidad?", "Descuento respaldado por la incertidumbre del modelo."]].map(([label, title, copy]) => <article key={label}><div><span className={styles.overline}>{label}</span><h3>{title}</h3><p>{copy}</p></div></article>)}
              </div>
            </div>
            <p className={styles.finePrint}>Tres lentes de la propuesta conceptual. El ranking actual utiliza los seis factores indicados; no suma tres subíndices.</p>
          </section>
        </SceneShell>

        <SceneShell index={13} active={active} state={sceneState(13)} label={SCENES[13].title}>
          <section className={styles.sceneCanvas}>
            <SceneHeader kicker="Comprar vs. alquilar" title="Compara tu patrimonio. No solo la cuota." />

            <div className={styles.financePremise}><span>Mismo capital inicial</span><ArrowRight aria-hidden /><strong>Dos escenarios, año a año</strong><ArrowRight aria-hidden /><span>Patrimonio neto</span></div>
            <div className={styles.comparisonGrid}>
              <article><span className={styles.overline}>Comprar</span><h3>Vivienda + inversión</h3><p>Entrada, hipoteca e intereses.<br />Impuestos y gastos de compra y venta.<br />Comunidad, IBI, seguros y mantenimiento.<br />Revalorización de la vivienda.</p></article>
              <article><span className={styles.overline}>Alquilar</span><h3>Flexibilidad + inversión</h3><p>Alquiler y sus subidas.<br />Capital disponible que permanece invertido.<br />Diferencia de gasto invertida cada año.<br />Rentabilidad neta e inflación.</p></article>
            </div>
            <p className={styles.takeaway}><strong>Tu vida cambia el resultado.</strong> Horizonte, movilidad, liquidez y perspectivas laborales.</p>
            <p className={styles.finePrint}>Simulación bajo supuestos ajustables, con año de equilibrio y sensibilidad. No garantiza rentabilidades futuras.</p>
          </section>
        </SceneShell>

        <SceneShell index={14} active={active} state={sceneState(14)} label={SCENES[14].title}>
          <section className={`${styles.sceneCanvas} ${styles.productScene}`}>
            <SceneHeader kicker="Innovación · productivización" title="El modelo no vive en un cuaderno." />
            <div className={styles.architectureFlow}>
              <ArchitectureNode icon={<span className={styles.humanGlyph}>U</span>} label="Usuario" detail="lenguaje natural" />
              <ArchitectureArrow label="SSE" />
              <ArchitectureNode icon={<Sparkle />} label="Agente" detail="8 herramientas" accent />
              <ArchitectureArrow label="tool-use" />
              <ArchitectureNode icon={<ChartLineUp />} label="Valoración" detail="punto + intervalo" />
              <ArchitectureArrow label="lote" />
              <ArchitectureNode icon={<Database />} label="Datos vivos" detail="Idealista · INE · BdE · ORS" />
            </div>
            <blockquote className={styles.productQuote}>
              <p>«A 14′ en metro de tu trabajo, un 12 % por debajo de lo esperable y con un intervalo que respalda la señal.»</p>
              <footer>El usuario recibe una decisión explicada, no ocho respuestas técnicas.</footer>
            </blockquote>
            <div className={styles.productionPrinciples}>
              <span><Check aria-hidden /> Enriquecimiento por lotes</span>
              <span><Check aria-hidden /> Degradación elegante</span>
              <span><Check aria-hidden /> Trazabilidad sin PII</span>
              <span><Check aria-hidden /> Next.js · Python · Supabase · Vercel</span>
            </div>
            <CourseLine courses="NLP · Modelos generativos · Productivizar un modelo · SQL · BI" />
          </section>
        </SceneShell>

        <SceneShell index={15} active={active} state={sceneState(15)} label={SCENES[15].title}>
          <section className={styles.sceneCanvas}>
            <SceneHeader kicker="Demo · producto en funcionamiento" title="Del perfil al porqué, en directo." />

            <div className={styles.demoLayout}>
              <div className={styles.editorialLead}><span className={styles.overline}>Una búsqueda real</span><h3>«Quiero vivir<br /><em>más cerca.»</em></h3><p>Define zona, presupuesto y trayecto. Descubre qué viviendas encajan y por qué.</p></div>
              <div className={styles.demoLinks}>
                <a href="/dashboard" target="_blank" rel="noopener noreferrer" onClick={pauseTimer}><span>01 · Explorar viviendas</span><strong>Del perfil al ranking <ArrowRight aria-hidden /></strong><small>Abrir el panel en otra pestaña</small></a>
                <a href="/comprar-o-alquilar" target="_blank" rel="noopener noreferrer" onClick={pauseTimer}><span>02 · Comparar escenarios</span><strong>Comprar o alquilar <ArrowRight aria-hidden /></strong><small>Abrir la calculadora en otra pestaña</small></a>
              </div>
            </div>
            <p className={styles.finePrint}>El reloj se pausa al abrir la demo. Al volver, pulsa P para continuar la exposición.</p>
          </section>
        </SceneShell>

        <SceneShell index={16} active={active} state={sceneState(16)} label={SCENES[16].title}>
          <section className={styles.sceneCanvas}>
            <SceneHeader kicker="Roadmap" title="Demostrar. Validar. Escalar." />

            <div className={styles.roadmapGrid}>
              <article><span className={styles.statusPill}>Prototipo disponible</span><h3>Demostrar<br />inteligencia.</h3><ul><li>Idealista + fuentes de contexto</li><li>Scoring y chatbot</li><li>Valoración y dashboard</li><li>Comprar vs. alquilar</li></ul></article>
              <article><span className={styles.overline}>Siguiente · MVP</span><h3>Validar<br />con usuarios.</h3><ul><li>Medir utilidad y tiempo ahorrado</li><li>Integración multiportal</li><li>Alertas y búsquedas periódicas</li><li>Validación del servicio B2C</li></ul></article>
              <article><span className={styles.overline}>Visión</span><h3>Escalar<br />el producto.</h3><ul><li>Más ciudades</li><li>Despliegue a empresas · B2B</li><li>Visita virtual de 2D a 3D</li><li>Predicción de revalorización</li></ul></article>
            </div>
            <p className={styles.finePrint}>Hoja de ruta propuesta, sin fechas comprometidas. La expansión requiere nuevos datos y validación local.</p>
          </section>
        </SceneShell>

        <SceneShell index={17} active={active} state={sceneState(17)} label={SCENES[17].title}>
          <section className={`${styles.sceneCanvas} ${styles.closingScene}`}>
            <div className={styles.closingMark}><Logo variant="mark" highlightClassName={styles.closingAccent} /></div>
            <div className={styles.closingContent}>
              <p className={styles.kicker}>Conclusión</p>
              <h2>HabitIA convierte incertidumbre en una decisión que se puede defender.</h2>
              <div className={styles.closingPoints}>
                <span><strong>−47 %</strong> de error</span>
                <span><strong>4,25 pt</strong> vale la ubicación</span>
                <span><strong>89,8 %</strong> de cobertura</span>
                <span><strong>19/19</strong> distritos validados</span>
              </div>
              <div className={styles.limitations}>
                <p><span>Límite</span> 2018 → 2026 se renivela con IPV ×1,553; es un supuesto con fuente oficial, no una medición directa.</p>
                <p><span>Siguiente</span> Reentrenamiento continuo, más ciudades y señales multimodales de texto e imagen.</p>
              </div>
            </div>
            <footer className={styles.thankYou}>
              <strong>Gracias.</strong>
              <span>habitiaucm.vercel.app</span>
            </footer>
          </section>
        </SceneShell>
      </div>

      <header
        className={`${styles.topChrome} ${chromeVisible ? "" : styles.chromeHidden}`}
        aria-hidden={!started || !chromeVisible}
        ref={(element) => { if (element) element.inert = !started || !chromeVisible; }}
      >
        <div className={styles.brandChip}>
          <a href="/" className={styles.exitLink} aria-label="Salir de la presentación" title="Salir de la presentación"><Logo variant="inline" /></a>
          <span>TFM</span>
        </div>
        <div className={styles.sceneIdentity}>
          <span>{String(active + 1).padStart(2, "0")} / {String(SCENES.length).padStart(2, "0")}</span>
          <p>{SCENES[active].kicker}</p>
        </div>
        <div className={styles.timerGroup}>
          <button type="button" onClick={togglePause} aria-label={running ? "Pausar reloj" : "Continuar reloj"} title="Pausar reloj (P)">
            {running ? <Pause aria-hidden weight="fill" /> : <Play aria-hidden weight="fill" />}
          </button>
          <div>
            <span>Restante</span>
            <strong className={remaining < 0 ? styles.overtime : ""}>{remaining < 0 ? "+" : ""}{formatClock(Math.abs(remaining))}</strong>
          </div>
        </div>
      </header>

      <div className={`${styles.progressRail} ${chromeVisible ? "" : styles.chromeHidden}`} aria-label={`Progreso: ${Math.round(progress)} %`}>
        <i style={{ transform: `scaleX(${progress / 100})` }} />
      </div>

      <footer
        id="presentation-controls"
        className={`${styles.controls} ${chromeVisible ? "" : styles.chromeHidden}`}
        aria-hidden={!started || !chromeVisible}
        ref={(element) => { if (element) element.inert = !started || !chromeVisible; }}
      >
        <button type="button" onClick={previous} disabled={active === 0} aria-label="Escena anterior" title="Anterior (←)">
          <ArrowLeft aria-hidden />
        </button>
        <div className={styles.sceneDots} aria-label="Escenas">
          {SCENES.map((scene, index) => (
            <button
              key={scene.title}
              type="button"
              onClick={() => goTo(index)}
              aria-label={`Ir a escena ${index + 1}: ${scene.title}`}
              aria-current={index === active ? "step" : undefined}
              className={index === active ? styles.dotActive : ""}
            >
              <span />
            </button>
          ))}
        </div>
        <button type="button" onClick={next} disabled={active === SCENES.length - 1} aria-label="Escena siguiente" title="Siguiente (→)">
          <ArrowRight aria-hidden />
        </button>
        <span className={styles.controlDivider} />
        <button
          type="button"
          onClick={() => setNotesOpen((value) => !value)}
          aria-pressed={notesOpen}
          aria-label={notesOpen ? "Ocultar notas del ponente" : "Mostrar notas del ponente"}
          title="Notas (N)"
        >
          <NotePencil aria-hidden />
        </button>
        <button type="button" onClick={toggleFullscreen} aria-label="Pantalla completa" title="Pantalla completa (F)">
          <ArrowsOut aria-hidden />
        </button>
      </footer>

      <aside
        className={`${styles.notesPanel} ${notesOpen ? styles.notesOpen : ""}`}
        aria-hidden={!notesOpen}
        ref={(element) => { if (element) element.inert = !notesOpen; }}
      >
        <button type="button" onClick={() => setNotesOpen(false)} aria-label="Cerrar notas"><X aria-hidden /></button>
        <div className={styles.notesHeading}>
          <NotePencil aria-hidden />
          <span>Notas del ponente</span>
        </div>
        <p className={styles.notesScene}>Escena {active + 1} · {SCENES[active].kicker}</p>
        <h2>{SCENES[active].title}</h2>
        <p className={styles.notesCopy}>{SCENES[active].note}</p>
        <div className={styles.notesTiming}>
          <Timer aria-hidden />
          <div><span>Tramo</span><strong>{formatClock(segmentDuration)}</strong></div>
          <div><span>Objetivo acumulado</span><strong>{formatClock(SCENES[active].target)}</strong></div>
          <div><span>Ritmo</span><strong className={paceDelta > 15 ? styles.paceLate : styles.paceGood}>{paceDelta > 0 ? `+${formatClock(paceDelta)}` : `−${formatClock(Math.abs(paceDelta))}`}</strong></div>
        </div>
        <div className={styles.shortcutHelp}>
          <span><kbd>←</kbd><kbd>→</kbd> navegar</span>
          <span><kbd>P</kbd> pausar</span>
          <span><kbd>H</kbd> ocultar controles</span>
          <span><kbd>F</kbd> pantalla completa</span>
        </div>
      </aside>
    </main>
  );
}

function SceneShell({
  index,
  active,
  state,
  label,
  children,
}: {
  index: number;
  active: number;
  state: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${styles.scene} ${state}`}
      aria-hidden={index !== active}
      ref={(element) => { if (element) element.inert = index !== active; }}
      aria-label={label}
      data-scene={index}
    >
      {children}
    </div>
  );
}

function SceneHeader({ kicker, title }: { kicker: string; title: string }) {
  return (
    <header className={styles.sceneHeader}>
      <p className={`${styles.kicker} ${styles.reveal}`} style={{ "--i": 0 } as React.CSSProperties}>{kicker}</p>
      <h2 className={styles.reveal} style={{ "--i": 1 } as React.CSSProperties}>{title}</h2>
    </header>
  );
}

function CourseLine({ courses }: { courses: string }) {
  return <p className={styles.courseLine}><span>Del máster</span>{courses}</p>;
}

function PipelineStep({ index, value, label, detail, icon }: { index: string; value: string; label: string; detail: string; icon: React.ReactNode }) {
  return (
    <article className={styles.reveal} style={{ "--i": Number(index) - 1 } as React.CSSProperties}>
      <span className={styles.pipelineIndex}>{index}</span>
      <div className={styles.pipelineIcon}>{icon}</div>
      <strong>{value}</strong>
      <h3>{label}</h3>
      <p>{detail}</p>
    </article>
  );
}

function ArchitectureNode({ icon, label, detail, accent = false }: { icon: React.ReactNode; label: string; detail: string; accent?: boolean }) {
  return (
    <div className={`${styles.architectureNode} ${accent ? styles.architectureAccent : ""}`}>
      <span>{icon}</span>
      <strong>{label}</strong>
      <small>{detail}</small>
    </div>
  );
}

function ArchitectureArrow({ label }: { label: string }) {
  return <div className={styles.architectureArrow}><span>{label}</span><ArrowRight aria-hidden /></div>;
}
