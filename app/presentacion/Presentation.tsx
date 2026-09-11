"use client";

import {
  ArrowLeft,
  ArrowRight,
  ArrowsOut,
  Sparkle,
  ShieldCheck,
  Lightbulb,
  Eye,
  Database,
  Check,
  ChartLineUp,
  NotePencil,
  Pause,
  Play,
  Timer,
  X,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { MotionPreferenceProvider, DataPartition, ModelEvidence, UncertaintyEvidence, ScopeEvidence, ExplanationEvidence } from "./ResultsVisuals";
import { results, formatCount } from "./results-contract";
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

const MAIN_SCENE_COUNT = 12;
const SCENES: SceneDefinition[] = [
  {
    "kicker": "Portada",
    "title": "HabitIA",
    "target": 10,
    "note": "Presenta el nombre, al equipo y la decisión que conecta HabitIA."
  },
  {
    "kicker": "Problema",
    "title": "Decidir vivienda pesa cada vez más",
    "target": 65,
    "note": "INE Q2 2026: +12,2% general y +12,9% segunda mano, redondeados a 12% y 13%. Explicar el trabajo de comparar; no afirmar ahorro medido."
  },
  {
    "kicker": "Oportunidad",
    "title": "El hueco que exploramos",
    "target": 95,
    "note": "La revisión de funciones públicas identifica herramientas de búsqueda, valoración y comparación financiera. Nuestra hipótesis es integrarlas en un recorrido. No acredita exclusividad."
  },
  {
    "kicker": "Solución",
    "title": "Del flujo actual a HabitIA",
    "target": 145,
    "note": "Mostrar las dos secuencias. Acertar, fácil y rápido son objetivos que quedan por validar con usuarios."
  },
  {
    "kicker": "Propuesta de valor",
    "title": "Todo el recorrido en HabitIA",
    "target": 195,
    "note": "Compra y alquiler, top cinco, chatbot, automatización diaria y comparación de todo el patrimonio. Cinco es un máximo cuando existen candidatos compatibles."
  },
  {
    "kicker": "Metodología",
    "title": "Una técnica para cada paso",
    "target": 250,
    "note": "Seguir recogida, EDA, modelado, plataforma, despliegue, chat y automatización. Destacar separación por activo, calibración independiente, comparación de modelos y límites de validación temporal."
  },
  {
    "kicker": "Motor de decisión",
    "title": "Filtrar calcular y ordenar",
    "target": 305,
    "note": "Fair compara oferta y estimación; Opportunity revalorización relativa; Zone calidad de vida; Lifestyle tiempo al trabajo. Los dos factores sin datos no se rellenan: explicar cobertura y pesos."
  },
  {
    "kicker": "Modelo de pricing",
    "title": "2018 y escenario temporal",
    "target": 360,
    "note": "LightGBM de oferta 2018, 25 variables y factor heredado 1,5534 para Q1 2026. Histórico INE separado de la actualización del artefacto. No existe modelo operativo de alquiler: se utiliza la renta del anuncio y se declara la ausencia de valoración."
  },
  {
    "kicker": "Comprar vs. alquilar",
    "title": "Compara todo el patrimonio",
    "target": 415,
    "note": "Contrastar enfoque básico cuota/renta con capital, cartera, gastos y fiscalidad. Otras herramientas pueden incluirlos también. Mismo capital y rentabilidad supuesta en ambas opciones."
  },
  {
    "kicker": "Demo",
    "title": "La plataforma en acción",
    "target": 521,
    "note": "Vídeo de 106 segundos: se elimina también el tramo 1:41–1:43. Capturas de la aplicación y datos de ejemplo; la historia conserva el audio de João."
  },
  {
    "kicker": "Roadmap",
    "title": "Demostrar validar y escalar",
    "target": 551,
    "note": "Hasta cinco viviendas diarias. Desplegar HabitIA y validar con usuarios reales. Futuro: revalorización, visita 2D a 3D, más ciudades, B2C y B2B."
  },
  {
    "kicker": "Cierre",
    "title": "La herramienta que echábamos en falta",
    "target": 561,
    "note": "HabitIA. La herramienta que echábamos en falta. Acierta, fácil, rápido."
  },
  {
    "kicker": "Anexo · HabitIA Score",
    "title": "Desglose del cálculo del HabitIA Score",
    "target": 561,
    "note": "Ejemplo ilustrativo de cobertura 50%: Fair 100, Lifestyle 81 a 20 minutos. Opportunity y Zone sin datos. Pesos 25 cada uno. Suma 45,25, redondeada a 45."
  },
  {
    "kicker": "Anexo · Datos",
    "title": "Datos históricos",
    "target": 561,
    "note": "La copia enriquecida contiene 94.852 registros históricos. Se auditan duplicados sobre las 41 variables originales y discrepancias de enriquecimiento, se aplican criterios de ámbito fijos y se documentan las exclusiones. Los precios y coordenadas de la fuente están perturbados. El protocolo principal comparte 25 variables con el servicio; no utiliza alquiler ni catastro de fecha no verificada."
  },
  {
    "kicker": "Anexo · Validación",
    "title": "Validación agrupada",
    "target": 561,
    "note": "La revisión utiliza tres grupos exteriores y tres internos por activo. Solo los grupos internos seleccionan hiperparámetros; calibración y evaluación permanecen separadas de cada ajuste. Todo 2018 ya fue inspeccionado: es una evaluación retrospectiva corregida, no un test virgen. El artefacto final se conserva tal como se evaluó."
  },
  {
    "kicker": "Anexo · Resultados",
    "title": "Resultados del modelo",
    "target": 561,
    "note": "La vista principal carga exclusivamente resultados_revision.json terminado: referencia territorial, hedónico Ridge y LightGBM con la misma entrada observable. Las pestañas Antecedentes y Ablación previa conservan el análisis exploratorio antiguo, identificado como no independiente porque su test intervino en la selección. No comparar directamente sus cifras con el artefacto revisado."
  },
  {
    "kicker": "Anexo · Incertidumbre",
    "title": "Intervalos",
    "target": 561,
    "note": "El intervalo se calibra por activo con máximo residual del grupo; el punto se incluye antes de calibrar. La interfaz muestra cobertura y anchura observadas en la revisión cuando existen resultados. El ejemplo deslizable es ilustrativo. Ni el 90 % nominal ni la cobertura histórica son la probabilidad de que una vivienda sea una ganga o de que el modelo acierte en 2026."
  },
  {
    "kicker": "Anexo · Alcance",
    "title": "Alcance de la evaluación",
    "target": 561,
    "note": "Distinguir evaluación exterior, artefacto fijo y diagnóstico Q1–Q3 a Q4: retrospectivas del mismo histórico, no tres pruebas externas. El promedio oculta límites: el decil más barato tiene cobertura por anuncio del 81,81 % y MdAPE del 16,24 %; en Q4 la cobertura por activo es 87,88 %. No mezclar ambas unidades. El salto a 2026 permanece sin validación actual."
  },
  {
    "kicker": "Anexo · Arquitectura",
    "title": "Arquitectura del producto",
    "target": 561,
    "note": "Panel y chat usan el mismo backend de valoración de oferta. El servicio devuelve estado, versión, intervalo y SHAP opcional. SSE permite respuesta progresiva. La demo del TFM guarda un historial y unos favoritos globales en Supabase, compartidos entre visitantes. El perfil se configura en el navegador; al activar Notificaciones se guarda una copia en Supabase para preparar la selección diaria. La bandeja se identifica mediante una cookie propia de ese navegador, sin cuenta de usuario. Si una fuente falla o falta soporte, se informa y se evita presentar respaldo ilustrativo como evidencia."
  },
  {
    "kicker": "Anexo · Precio y encaje",
    "title": "Precio confianza y encaje",
    "target": 561,
    "note": "El comprador solo ve el promedio de una zona, aunque dos pisos del mismo barrio puedan ser radicalmente distintos. HabitIA responde tres preguntas: qué precio cabe esperar, cuánto puede variar y qué vivienda encaja con la persona. La estimación usa el modelo, el rango expresa la incertidumbre y el Score ordena según las preferencias. Son tres conceptos distintos."
  },
  {
    "kicker": "Anexo · Asignaturas",
    "title": "22 asignaturas",
    "target": 561,
    "note": "No intentamos marcar veintidós casillas. Organizamos lo aprendido en cuatro capas: ingeniería, modelización, IA y producto. También justificamos qué no usar: 94.000 filas tabulares no necesitaban Spark, una RNN ni deep learning; y la persistencia relacional favorecía PostgreSQL frente a NoSQL."
  },
  {
    "kicker": "Anexo · Lectura económica",
    "title": "Lectura económica",
    "target": 561,
    "note": "La regla compara el precio anunciado con el intervalo del modelo. El contraste de rentabilidad anterior comparte PRICE en su denominador, por lo que no constituye una validación económica independiente. No llamar ahorro observado a una brecha estimada. La revisión externa de candidatos, comparables y precios de cierre queda pendiente."
  },
  {
    "kicker": "Anexo · SHAP",
    "title": "Interpretabilidad",
    "target": 561,
    "note": "Las importancias se recalculan desde los valores SHAP nativos del experimento revisado, promediando magnitudes por grupo exterior. Se muestran las seis variables principales y el resto agrupado. Son atribuciones en escala logarítmica normalizadas, no efectos causales ni proporciones del precio. Hasta terminar el experimento no se muestran porcentajes nuevos."
  }
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
    const tick = () => setElapsed(Math.floor((accumulatedRef.current + performance.now() - startedAtRef.current) / 1000));
    tick();
    const interval = window.setInterval(tick, 250);
    return () => window.clearInterval(interval);
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

function sceneBuilds(index: number): HTMLElement[] {
  if ([0, 9, 11].includes(index)) return [];
  const scene = document.querySelector(`[data-scene="${index}"] section`);
  return Array.from(scene?.children ?? []).slice(1).flatMap((element) =>
    element.hasAttribute("data-build-group") ? Array.from(element.children) : [element]
  ) as HTMLElement[];
}

export function Presentation() {
  const [active, setActive] = useState(0);
  const [build, setBuild] = useState(0);
  const [started, setStarted] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [chromeVisible, setChromeVisible] = useState(false);
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
    (index: number, showComplete = false) => {
      const next = Math.max(0, Math.min(SCENES.length - 1, index));
      if (next === active) return;
      setBuild(showComplete ? sceneBuilds(next).length : 0);
      setActive(next);
      if (!started) {
        setStarted(true);
        startTimer();
      }
    },
    [active, started, startTimer]
  );

  const begin = useCallback(() => {
    if (!started) {
      setStarted(true);
      resetAndStart();
    }
    setActive(1);
  }, [resetAndStart, started]);

  const next = useCallback(() => {
    const count = sceneBuilds(active).length;
    if (build < count) setBuild(build + 1);
    else goTo(Math.min(SCENES.length - 1, active + 1));
  }, [active, build, goTo]);
  const previous = useCallback(() => {
    if (build > 0) setBuild(build - 1);
    else goTo(active - 1, true);
  }, [active, build, goTo]);

  useLayoutEffect(() => {
    const blocks = sceneBuilds(active);
    blocks.forEach((element, index) => {
      const hidden = index >= build;
      element.classList.add(styles.buildBlock);
      element.classList.toggle(styles.buildHidden, hidden);
      element.setAttribute("aria-hidden", String(hidden));
      element.inert = hidden;
    });
    if (build > 0 && window.matchMedia("(max-width: 700px)").matches) {
      blocks[build - 1]?.scrollIntoView({ block: "nearest" });
    }
  }, [active, build]);

  const togglePause = useCallback(() => {
    if (running) pauseTimer();
    else startTimer();
  }, [pauseTimer, running, startTimer]);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen();
  }, []);

  useEffect(() => {
    if (active !== 9) videoRef.current?.pause();
    else { const video = videoRef.current; if (video) { video.currentTime = 0; void video.play().catch(() => {}); } }
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

      if (event.key === " " && target?.closest("button, a")) return;

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
        goTo(MAIN_SCENE_COUNT - 1);
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
  const segmentDuration = Math.max(0, SCENES[active].target - segmentStart);
  const paceDelta = elapsed - SCENES[active].target;

  const sceneState = useMemo(
    () => (index: number) => {
      if (index === active) return styles.sceneActive;
      const isPast = index < active;
      return isPast ? styles.scenePast : styles.sceneFuture;
    },
    [active]
  );

  return (
    <MotionPreferenceProvider value={reducedMotion}>
    <main className={styles.presentation} data-motion={reducedMotion ? "reduced" : "system"} data-started={started} data-active={active} data-closing={active === MAIN_SCENE_COUNT - 1}>
      <a className={styles.skipLink} href="#presentation-controls" onClick={() => setChromeVisible(true)}>
        Ir a los controles
      </a>

      <div className={styles.ambient} aria-hidden>
        <span />
        <span />
      </div>

      <div className={styles.sceneStack} aria-live="polite" onClick={(event) => {
        if ((event.target as HTMLElement).closest("button, input, select, textarea")) return;
        event.preventDefault();
        next();
      }}>
        <SceneShell index={0} active={active} state={sceneState(0)} label={SCENES[0].title}>
          <section className={`${styles.openingScene} ${styles.sceneCanvas}`}>
            <div className={styles.opening}>
              <div className={styles.openingMeta}>
                <Logo
                  variant="inline"
                  className={styles.openingLogo}
                  highlightClassName={styles.openingLogoAccent}
                />
                <span>Trabajo Fin de Máster · UCM</span>
              </div>
              <div>

                <h1 className={styles.openingTitle}>
                  Encontrar piso.
                  <br />
                  Entender la decisión.
                </h1>

                <p className={styles.openingByline}>
                  Mauricio Peón García · João Paulo Nogueira Cunha · Manuel Macedo Púlido
                  <br />
                  Aldo Mauricio Ress Villets · Tomás Pérales Lara
                </p>
              </div>
              <p className={styles.advanceHint}>→ o clic para avanzar · ← para volver · F pantalla completa · H controles</p>
            </div>
          </section>
        </SceneShell>

        <SceneShell index={1} active={active} state={sceneState(1)} label={SCENES[1].title}>
          <section className={styles.sceneCanvas}>
            <SceneHeader kicker="El problema" title="Buscar agota. Decidir exige contexto." />

            <div className={styles.problemLayout}>
              <div className={styles.editorialLead}><span className={styles.overline}>La oportunidad</span><h3>Más anuncios.<br /><em>Menos claridad.</em></h3><p>La información existe. Falta conectarla con la vida de quien busca.</p><div className={styles.problemMetrics}><span><strong>+12%</strong> vivienda</span><span><strong>+13%</strong> segunda mano</span><small>INE · España · Q2 2026 · variación anual (12,2% y 12,9%)</small></div></div>
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
<section className={`${styles.sceneCanvas} ${styles.clearScene}`}><SceneHeader kicker="Oportunidad · estudio de mercado" title="Conectar lo que hoy consultamos por separado." /><div className={styles.marketTable}><table><thead><tr><th>Soluciones revisadas</th><th>Qué aportan</th><th>Nuestra oportunidad</th></tr></thead><tbody><tr><td><a href="https://www.idealista.com/info/aviso-via-mail?tipo=sms" target="_blank" rel="noreferrer">Idealista</a> · <a href="https://www.fotocasa.es/es" target="_blank" rel="noreferrer">Fotocasa</a></td><td>Búsqueda de compra y alquiler, filtros y alertas</td><td>Priorizar por preferencias explícitas</td></tr><tr><td><a href="https://www.idealista.com/tools/centrodeayuda/articulos/estimar-el-precio-de-un-inmueble/" target="_blank" rel="noreferrer">Herramientas de valoración</a></td><td>Estimación y comparables del inmueble</td><td>Conectar precio, trayecto y explicación</td></tr><tr><td><a href="https://www.ocu.org/vivienda-y-energia/comprar-vender-alquilar/consejos/alquilar-o-comprar/" target="_blank" rel="noreferrer">Comparación económica</a></td><td>Costes y alternativas de inversión</td><td>Integrar la decisión patrimonial en la búsqueda</td></tr></tbody></table></div><p className={styles.takeaway}>El hueco que exploramos: <strong>búsqueda, ranking, conversación y patrimonio en un mismo recorrido.</strong></p><p className={styles.finePrint}>Revisión de funciones públicas · septiembre 2026. Propuesta de integración; no acredita exclusividad frente a todo el mercado.</p></section>
        </SceneShell>

        <SceneShell index={3} active={active} state={sceneState(3)} label={SCENES[3].title}>
<section className={`${styles.sceneCanvas} ${styles.clearScene}`}><SceneHeader kicker="Solución" title="De repetir búsquedas a entender tus opciones." /><div data-build-group className={styles.journeyRows}><article><span>Hoy</span><ol><li>Repetir filtros</li><li>Abrir muchos anuncios</li><li>Comparar a mano</li><li>Calcular gastos aparte</li><li>Decidir con dudas</li></ol></article><article><span>Con HabitIA</span><ol><li>Definir tu perfil</li><li>Recibir hasta 5 viviendas</li><li>Entender el encaje</li><li>Simular tu patrimonio</li><li>Decidir con contexto</li></ol></article></div><div className={styles.promiseRow}><strong>¿Resultado? Ahorra tiempo y esfuerzo al encontrar tu piso</strong></div><p className={styles.finePrint}>Objetivos de experiencia; el ahorro de tiempo y la utilidad se medirán con usuarios.</p></section>
        </SceneShell>

        <SceneShell index={4} active={active} state={sceneState(4)} label={SCENES[4].title}>
<section className={`${styles.sceneCanvas} ${styles.clearScene}`}><SceneHeader kicker="Propuesta de valor" title="Todo el recorrido, en HabitIA." /><div data-build-group className={styles.valueGrid}><article><span>01</span><h3>Compra y alquiler</h3><p>Un portal para ambas búsquedas; anuncios de Idealista.</p></article><article><span>02</span><h3>Top 5 para ti</h3><p>Hasta cinco viviendas ordenadas por tu HabitIA Score.</p></article><article><span>03</span><h3>Un chat que explica</h3><p>Pregunta por las viviendas, los criterios y los resultados.</p></article><article><span>04</span><h3>Búsqueda diaria</h3><p>Automatiza el recomendador con tu perfil y horario.</p></article><article><span>05</span><h3>Comprar vs. alquilar</h3><p>Compara vivienda, deuda, cartera, gastos, impuestos e inflación.</p></article></div><p className={styles.takeaway}>De encontrar opciones a <strong>entender la decisión completa.</strong></p></section>
        </SceneShell>

        <SceneShell index={5} active={active} state={sceneState(5)} label={SCENES[5].title}>
<section className={`${styles.sceneCanvas} ${styles.clearScene}`}><SceneHeader kicker="Metodología · del máster al producto" title="Una técnica para cada paso." /><div data-build-group className={styles.methodGrid}><article><span>01</span><h3>Recoger</h3><p>Anuncios históricos y fuentes de contexto.</p><small>Python · SQL · Linux / Git</small></article><article><span>02</span><h3>Explorar</h3><p>Calidad, duplicados, ausencias y distribución.</p><small>Estadística · Minería de datos</small></article><article><span>03</span><h3>Modelar</h3><p>Ridge, LightGBM, validación agrupada, intervalos y SHAP.</p><small>Machine Learning · Data science</small></article><article><span>04</span><h3>Construir y desplegar</h3><p>Servicio Python, interfaz y persistencia.</p><small>Productivización · Visualización · BI</small></article><article><span>05</span><h3>Conversar</h3><p>Interpretar preguntas y conectar herramientas.</p><small>NLP · Modelos generativos</small></article><article><span>06</span><h3>Automatizar</h3><p>Selección diaria, caché, cuota y reintentos.</p><small>SQL · Ingeniería de workflows</small></article></div><p className={styles.finePrint}>Validación por activo, calibración separada y comparación con Ridge y referencia territorial. Datos de 2018: evaluación retrospectiva, sin validación contemporánea.</p></section>
        </SceneShell>

        <SceneShell index={6} active={active} state={sceneState(6)} label={SCENES[6].title}>
<section className={`${styles.sceneCanvas} ${styles.clearScene}`}><SceneHeader kicker="Motor de decisión" title="Filtrar, calcular y ordenar." /><div className={styles.scoreFormula}>HabitIA Score = (α × Fair + β × Opportunity + γ × Zone + δ × Lifestyle) / 100</div><div data-build-group className={styles.scoreComponents}><article><h3>Fair · precio</h3><p>Oferta frente a la estimación individual válida. Bandas: 100 / 85 / 62 / 32 / 12 puntos.</p></article><article><h3>Opportunity · inversión</h3><p>Revalorización de la zona frente a la media de la ciudad. Sin series comparables: sin datos.</p></article><article><h3>Zone · calidad de vida</h3><p>Indicadores del barrio y una metodología verificable. Pendiente de datos; sin puntuación.</p></article><article><h3>Lifestyle · tiempo al trabajo</h3><p>100 puntos hasta 10 min; −1,9 por minuto hasta 5 puntos desde 60 min. Ruta en el modo elegido.</p></article></div><p className={styles.finePrint}>Pesos de 0 a 100 que suman 100. Los factores sin datos no aportan puntos; su peso no se redistribuye. La cobertura acompaña siempre al score.</p></section>
        </SceneShell>

        <SceneShell index={7} active={active} state={sceneState(7)} label={SCENES[7].title}>
<section className={`${styles.sceneCanvas} ${styles.clearScene}`}><SceneHeader kicker="Modelo de pricing" title="De la oferta de 2018 al escenario temporal." /><div data-build-group className={styles.pricingSteps}><article><span>01 · Cómo aprende el modelo</span><h3>LightGBM · 25 variables</h3><p>Anuncios de venta de 2018 → limpieza y exploración → comparación con Ridge y referencia territorial → validación por activo → intervalos calibrados y SHAP.</p></article><article><span>02 · Compra y alquiler en 2026</span><div data-build-group className={styles.comparisonGrid}><div><h3>Compra</h3><p>Estimación 2018 × 1,5534. Escenario Q1 2026 del artefacto, con referencia declarada al IPV de Madrid de segunda mano.</p></div><div><h3>Alquiler</h3><p>Renta mensual del anuncio actual. La valoración del alquiler está pendiente de un modelo o una referencia verificable.</p></div></div></article></div><p className={styles.takeaway}>Indexar cambia el nivel del precio. <strong>No equivale a reentrenar ni validar el modelo en 2026.</strong></p><p className={styles.finePrint}>La página Datos muestra el histórico IPV desde 2018 hasta el último trimestre recibido. Sustituir el factor del artefacto requiere verificar serie, base y periodo.</p></section>
        </SceneShell>

        <SceneShell index={8} active={active} state={sceneState(8)} label={SCENES[8].title}>
<section className={`${styles.sceneCanvas} ${styles.clearScene}`}><SceneHeader kicker="Comprar vs. alquilar" title="La cuota es solo una parte de la comparación." /><div data-build-group className={styles.comparisonGrid}><article><span className={styles.overline}>Comparación básica</span><h3>Precio, renta e hipoteca</h3><p>Precio de compra y entrada.<br />Alquiler mensual.<br />Tipo y plazo de la hipoteca.<br />Horizonte de la comparación.</p></article><article><span className={styles.overline}>Qué añade HabitIA</span><h3>Todo el patrimonio</h3><p>Gastos a fondo perdido: compra, mantenimiento, comunidad, IBI y seguros.<br />Revalorización del capital que puede permanecer invertido.<br />Tus perspectivas, saltos laborales, mudanzas dentro y fuera del país.</p></article></div><p className={styles.takeaway}>Compara <strong>patrimonio neto, año de equilibrio y sensibilidad</strong> con supuestos editables.</p><p className={styles.finePrint}>Las mudanzas y los cambios laborales orientan tu decisión; no se simulan automáticamente como flujos económicos.</p></section>
        </SceneShell>

        <SceneShell index={9} active={active} state={sceneState(9)} label={SCENES[9].title}>
          <section className={`${styles.sceneCanvas} ${styles.clearScene} ${styles.demoScene}`}>
            <SceneHeader kicker="Demo · historia y recorrido de la plataforma" title="Así se convierte una búsqueda en una decisión." />
            <div className={styles.demoPlayer}><video ref={videoRef} playsInline preload="metadata" poster="/presentacion/demo-poster.jpg"><source src="/presentacion/habitia-demo.mp4" type="video/mp4" /><track kind="captions" src="/presentacion/demo-captions.vtt" srcLang="es" label="Español" />Tu navegador no puede reproducir el vídeo.</video></div>
            <div className={styles.demoActions}><span>João: historia conceptual · Aplicación actual con datos de ejemplo</span></div>
          </section>
        </SceneShell>

        <SceneShell index={10} active={active} state={sceneState(10)} label={SCENES[10].title}>
          <section className={styles.sceneCanvas}>
            <SceneHeader kicker="Roadmap" title="Demostrar. Validar. Escalar." />

            <div data-build-group className={styles.roadmapGrid}>
              <article><span className={styles.statusPill}>Prototipo disponible</span><h3>Demostrar<br />inteligencia.</h3><ul><li>Idealista + fuentes de contexto</li><li>Scoring, valoración y chatbot</li><li>Comprar vs. alquilar</li><li>Selección diaria · hasta cinco viviendas</li></ul></article>
              <article><span className={styles.overline}>Siguiente · MVP</span><h3>Desplegar<br />HabitIA</h3><ul><li>Medir utilidad y tiempo ahorrado</li><li>Integración multiportal</li><li>Validar con usuarios reales</li></ul></article>
              <article><span className={styles.overline}>Visión</span><h3>Escalar<br />el producto.</h3><ul><li>Predicción de la revalorización</li><li>Visita virtual de 2D a 3D</li><li>Más ciudades</li><li>Testear B2C y B2B</li></ul></article>
            </div>
            <p className={styles.finePrint}>Hoja de ruta propuesta, sin fechas comprometidas. La expansión requiere nuevos datos y validación local.</p>
          </section>
        </SceneShell>

        <SceneShell index={11} active={active} state={sceneState(11)} label={SCENES[11].title}>
<section className={`${styles.sceneCanvas} ${styles.simpleClosing}`}><Logo variant="inline" className={styles.finalLogo} /><h2>La herramienta que echábamos en falta</h2><p>Acierta · Fácil · Rápido</p></section>
        </SceneShell>


        <SceneShell index={12} active={active} state={sceneState(12)} label={SCENES[12].title}>
<section className={`${styles.sceneCanvas} ${styles.clearScene}`}><SceneHeader kicker="Anexo · HabitIA Score" title="Cómo se calcula, punto por punto." /><div className={styles.scoreFormula}>HabitIA Score = (α × Fair + β × Opportunity + γ × Zone + δ × Lifestyle) / 100</div><div className={styles.scoreComponents}><article><h3>Fair · precio</h3><p>Oferta frente a la estimación individual válida. Bandas: 100 / 85 / 62 / 32 / 12 puntos.</p></article><article><h3>Opportunity · inversión</h3><p>Revalorización de la zona frente a la media de la ciudad. Sin series comparables: sin datos.</p></article><article><h3>Zone · calidad de vida</h3><p>Indicadores del barrio y una metodología verificable. Pendiente de datos; sin puntuación.</p></article><article><h3>Lifestyle · tiempo al trabajo</h3><p>100 puntos hasta 10 min; −1,9 por minuto hasta 5 puntos desde 60 min. Ruta en el modo elegido.</p></article></div><div className={styles.workedExample}><strong>Ejemplo ilustrativo · pesos 25 / 25 / 25 / 25</strong><p>Fair 100 · Opportunity sin datos · Zone sin datos · Lifestyle 81 (20 min)</p><p>(25 × 100 + 25 × 0 + 25 × 0 + 25 × 81) / 100 = 45,25 → <strong>45/100 · cobertura 50%</strong></p></div><p className={styles.finePrint}>Peso 0 descarta el componente; los demás deben sumar 100. Se redondea el resultado final. Una cobertura baja limita lo que representa la cifra.</p></section>
        </SceneShell>

        <SceneShell index={13} active={active} state={sceneState(13)} label={SCENES[13].title}>
          <section className={`${styles.sceneCanvas} ${styles.clearScene} ${styles.visualScene}`}>
            <SceneHeader kicker="01 · Preparar los datos" title="De los anuncios a un protocolo trazable." />
            <DataPartition active={active === 13} />
          </section>
        </SceneShell>

        <SceneShell index={14} active={active} state={sceneState(14)} label={SCENES[14].title}>
          <section className={`${styles.sceneCanvas} ${styles.clearScene}`}>
            <SceneHeader kicker="02 · Evaluación retrospectiva" title="Aprender, calibrar y evaluar por separado." />
            <div className={styles.examSplit}><article><span>Evaluación agrupada</span><strong>3 × 3</strong><p>Tres grupos exteriores y selección en tres grupos internos.</p></article><div className={styles.examDivider}><ShieldCheck aria-hidden /><span>Separación<br />por activo</span></div><article><span>Artefacto conservado</span><strong>{formatCount(results.sample.test)}</strong><p>Registros reservados en su partición fija histórica.</p></article></div>
            <div className={styles.validationChecks}><span><Check aria-hidden /> Estadísticas ajustadas solo donde corresponde</span><span><Check aria-hidden /> Calibración separada por activo</span><span><Check aria-hidden /> Mismo transformador en el servicio</span></div>
            <p className={styles.takeaway}><strong>El histórico ya fue explorado.</strong> La revisión mejora el protocolo; no crea datos externos nuevos.</p>
          </section>
        </SceneShell>

        <SceneShell index={15} active={active} state={sceneState(15)} label={SCENES[15].title}>
          <section className={`${styles.sceneCanvas} ${styles.clearScene} ${styles.visualScene}`}>
            <SceneHeader kicker="03 · Elegir el modelo" title="Del barrio a cada vivienda." />
            <ModelEvidence active={active === 15} />
          </section>
        </SceneShell>

        <SceneShell index={16} active={active} state={sceneState(16)} label={SCENES[16].title}>
          <section className={`${styles.sceneCanvas} ${styles.clearScene} ${styles.visualScene}`}>
            <SceneHeader kicker="04 · Expresar la incertidumbre" title="Un precio estimado necesita un margen." />
            <UncertaintyEvidence active={active === 16} />
          </section>
        </SceneShell>

        <SceneShell index={17} active={active} state={sceneState(17)} label={SCENES[17].title}>
          <section className={`${styles.sceneCanvas} ${styles.clearScene} ${styles.visualScene}`}>
            <SceneHeader kicker="05 · Conocer los límites" title="¿Hasta dónde llega la precisión?" />
            <ScopeEvidence active={active === 17} />
          </section>
        </SceneShell>

        <SceneShell index={18} active={active} state={sceneState(18)} label={SCENES[18].title}>
          <section className={`${styles.sceneCanvas} ${styles.clearScene}`}>
            <SceneHeader kicker="Del modelo al producto" title="Una pregunta activa toda la cadena." />
            <blockquote className={styles.questionHero}>«¿Qué pisos encajan conmigo<br />y por qué?»</blockquote>
            <ol className={styles.productChain}><li><Sparkle aria-hidden /><span>Entender</span><p>El agente interpreta tu petición.</p></li><li><Database aria-hidden /><span>Consultar</span><p>Obtiene viviendas y contexto.</p></li><li><ChartLineUp aria-hidden /><span>Comparar</span><p>Valora y ordena las opciones.</p></li><li><Eye aria-hidden /><span>Explicar</span><p>Devuelve razones comprensibles.</p></li></ol>
            <p className={styles.takeaway}>La IA conecta las herramientas. <strong>Los datos sostienen la respuesta.</strong></p>
          </section>
        </SceneShell>

        <SceneShell index={19} active={active} state={sceneState(19)} label={SCENES[19].title}>
          <section className={`${styles.sceneCanvas} ${styles.clearScene}`}>
            <SceneHeader kicker="Anexo · las tres preguntas" title="Precio, confianza y encaje son preguntas distintas." />
            <div className={styles.scopeCards}>
              <article><span>01 · Precio</span><h3>¿Cuánto cabe esperar?</h3><p>El modelo estima el precio a partir de las características y la localización.</p><strong className={styles.answerLabel}>Estimación</strong></article>
              <article><span>02 · Confianza</span><h3>¿Cuánto puede variar?</h3><p>El intervalo expresa el margen de incertidumbre de esa valoración.</p><strong className={styles.answerLabel}>Rango</strong></article>
              <article><span>03 · Encaje</span><h3>¿Tiene sentido para ti?</h3><p>El ranking combina las preferencias, el precio y el contexto del usuario.</p><strong className={styles.answerLabel}>Prioridad</strong></article>
            </div>
            <div className={styles.lesson}><Lightbulb aria-hidden /><p><strong>Una media de barrio no responde las tres.</strong> HabitIA conecta la valoración con las circunstancias de quien busca.</p></div>
          </section>
        </SceneShell>

        <SceneShell index={20} active={active} state={sceneState(20)} label={SCENES[20].title}>
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

        <SceneShell index={21} active={active} state={sceneState(21)} label={SCENES[21].title}>
          <section className={`${styles.sceneCanvas} ${styles.economicScene}`}>
            <SceneHeader kicker="Anexo · lectura económica" title="Una señal del modelo no demuestra infravaloración." />
            <div className={styles.economicGrid}>
              <div className={styles.opportunityCount}>
                <span>Precio bajo el intervalo</span><strong>≠</strong><p>ganancia o ganga acreditada</p>
                <div className={styles.dotField} aria-hidden>{Array.from({ length: 48 }).map((_, index) => <i key={index} className={index < 3 ? styles.dotHot : ""} />)}</div>
              </div>
              <div className={styles.economicFindings}>
                <div><span>Brecha del modelo</span><strong>Señal</strong></div>
                <div><span>Ahorro efectivo</span><strong>No medido</strong></div>
                <div><span>Revisión externa de casos</span><strong>Pendiente</strong><small>Comparables y factores omitidos</small></div>
              </div>
            </div>
            <div className={styles.naiveComparison}><span>El contraste anterior comparte el precio</span><p>Una menor oferta reduce la brecha y aumenta la rentabilidad calculada: ambas usan el mismo precio. Esa dependencia impide tomar el contraste como validación económica independiente.</p></div>
            <CourseLine courses="Contraste de hipótesis · Segmentación · Economía espacial · Data science aplicada" />
          </section>
        </SceneShell>

        <SceneShell index={22} active={active} state={sceneState(22)} label={SCENES[22].title}>
          <section className={`${styles.sceneCanvas} ${styles.clearScene} ${styles.visualScene}`}>
            <SceneHeader kicker="Anexo · Interpretabilidad" title="El precio tiene más de una explicación." />
            <ExplanationEvidence active={active === 22} />
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
          <span>{active < MAIN_SCENE_COUNT ? `${String(active + 1).padStart(2, "0")} / ${MAIN_SCENE_COUNT}` : `Anexo ${active - MAIN_SCENE_COUNT + 1} / ${SCENES.length - MAIN_SCENE_COUNT}`}</span>
          <select className={styles.scenePicker} aria-label="Ir a una sección" value={active} onChange={(event) => goTo(Number(event.target.value))}>
            <optgroup label="Presentación">{SCENES.slice(0, MAIN_SCENE_COUNT).map((scene,i)=><option key={scene.title} value={i}>{String(i+1).padStart(2,'0')} · {scene.kicker}</option>)}</optgroup>
            <optgroup label="Anexos para preguntas">{SCENES.slice(MAIN_SCENE_COUNT).map((scene, i) => <option key={scene.title} value={i + MAIN_SCENE_COUNT}>{scene.kicker}</option>)}</optgroup>
          </select>
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
          {SCENES.slice(0, MAIN_SCENE_COUNT).map((scene, index) => (
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
        <button type="button" onClick={next} disabled={active >= SCENES.length - 1} aria-label="Escena siguiente" title="Siguiente (→)">
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
        <label className={styles.motionPreference}><input type="checkbox" checked={reducedMotion} onChange={event => setReducedMotion(event.target.checked)} />Reducir movimiento</label>
        <div className={styles.shortcutHelp}>
          <span><kbd>←</kbd><kbd>→</kbd> navegar</span>
          <span><kbd>P</kbd> pausar</span>
          <span><kbd>H</kbd> ocultar controles</span>
          <span><kbd>F</kbd> pantalla completa</span>
        </div>
      </aside>
    </main>
    </MotionPreferenceProvider>
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
