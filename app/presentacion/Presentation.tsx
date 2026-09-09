"use client";

import {
  ArrowLeft,
  ArrowRight,
  ArrowsOut,
  ChartLineUp,
  Check,
  Database,
  Eye,
  Lightbulb,
  Gauge,
  NotePencil,
  Pause,
  Play,
  ShieldCheck,
  Sparkle,
  Timer,
  X,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MotionPreferenceProvider, DataPartition, ModelEvidence, UncertaintyEvidence, ScopeEvidence, ExplanationEvidence, ProductConcept } from "./ResultsVisuals";
import { Logo } from "@/components/ui/Logo";
import { results, formatCount } from "./results-contract";
import styles from "./presentation.module.css";

const TOTAL_SECONDS = 10 * 60;
const DEMO_SECONDS = 136;
const DEMO_START_SECONDS = 440;
const CLOSING_TARGET_SECONDS = DEMO_START_SECONDS + DEMO_SECONDS + 20;

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

const MAIN_SCENE_COUNT = 14;
const SCENES: SceneDefinition[] = [
  {
    kicker: "Apertura",
    title: "Una vivienda. Una decisión importante.",
    target: 10,
    note: "Presenta HabitIA y al equipo. El vídeo único aparece al final del recorrido: une la historia conceptual de João con capturas de la aplicación actual y datos de ejemplo. La apertura es estática para no repetir el vídeo.",
  },
  {
    kicker: "Problema",
    title: "Buscar agota. Decidir exige contexto.",
    target: 40,
    note: "La oferta está fragmentada, comparar exige tiempo y una misma vivienda depende de muchos factores. El borrador incluye cifras de mercado sin fuente completa; aquí explicamos el problema sin convertirlas en evidencia. La oportunidad es conectar anuncios, contexto y preferencias.",
  },
  {
    kicker: "Oportunidad · solución",
    title: "Una vivienda no se entiende aislada.",
    target: 70,
    note: "Recorre el antes y el después: portales, comparación manual e incertidumbre se convierten en perfil, datos, ranking y explicación. Ahorrar tiempo y decidir con más confianza son objetivos del producto, todavía no resultados medidos con usuarios.",
  },
  {
    kicker: "Recomendación",
    title: "Tus prioridades cambian el orden.",
    target: 110,
    note: "Se recuperan hasta ocho anuncios y se muestran hasta cinco. Se filtran incumplimientos conocidos de requisitos; se advierten los datos ausentes. Presupuesto, trayecto, requisitos y estimación del modelo cuando existe orientan el orden. Los índices manuales de seguridad/calidad de vida están retirados.",
  },
  {
    kicker: "Metodología · datos",
    title: "De los anuncios a un protocolo trazable.",
    target: 150,
    note: "La copia enriquecida contiene 94.852 registros históricos. Se auditan duplicados sobre las 41 variables originales y discrepancias de enriquecimiento, se aplican criterios de ámbito fijos y se documentan las exclusiones. Los precios y coordenadas de la fuente están perturbados. El protocolo principal comparte 25 variables con el servicio; no utiliza alquiler ni catastro de fecha no verificada.",
  },
  {
    kicker: "Metodología · validación",
    title: "Aprender, calibrar y evaluar por separado.",
    target: 185,
    note: "La revisión utiliza tres grupos exteriores y tres internos por activo. Solo los grupos internos seleccionan hiperparámetros; calibración y evaluación permanecen separadas de cada ajuste. Todo 2018 ya fue inspeccionado: es una evaluación retrospectiva corregida, no un test virgen. El artefacto final se conserva tal como se evaluó.",
  },
  {
    kicker: "Modelo de precio",
    title: "Del barrio a cada vivienda.",
    target: 235,
    note: "La vista principal carga exclusivamente resultados_revision.json terminado: referencia territorial, hedónico Ridge y LightGBM con la misma entrada observable. Las pestañas Antecedentes y Ablación previa conservan el análisis exploratorio antiguo, identificado como no independiente porque su test intervino en la selección. No comparar directamente sus cifras con el artefacto revisado.",
  },
  {
    kicker: "Incertidumbre",
    title: "Un precio estimado necesita un margen.",
    target: 280,
    note: "El intervalo se calibra por activo con máximo residual del grupo; el punto se incluye antes de calibrar. La interfaz muestra cobertura y anchura observadas en la revisión cuando existen resultados. El ejemplo deslizable es ilustrativo. Ni el 90 % nominal ni la cobertura histórica son la probabilidad de que una vivienda sea una ganga o de que el modelo acierte en 2026.",
  },
  {
    kicker: "Resultados · alcance",
    title: "¿Hasta dónde llega la precisión?",
    target: 325,
    note: "Distinguir evaluación exterior, artefacto fijo y diagnóstico Q1–Q3 a Q4: retrospectivas del mismo histórico, no tres pruebas externas. El promedio oculta límites: el decil más barato tiene cobertura por anuncio del 81,81 % y MdAPE del 16,24 %; en Q4 la cobertura por activo es 87,88 %. No mezclar ambas unidades. El salto a 2026 permanece sin validación actual.",
  },
  {
    kicker: "Comprar vs. alquilar",
    title: "Compara todo tu patrimonio.",
    target: 370,
    note: "Ambos escenarios parten del mismo capital disponible. Comprar destina una parte a la entrada y los gastos; el resto sigue invertido. Alquilar conserva invertido el capital que queda tras sus gastos iniciales. Ambas carteras usan la misma rentabilidad esperada e invierten la diferencia de gasto anual. La gráfica suma vivienda y cartera netas de deuda, costes e impuestos según los supuestos. Explica este coste de oportunidad sin afirmar que todos los demás comparadores lo omiten. Son escenarios, no rentabilidades garantizadas.",
  },
  {
    kicker: "Del modelo al producto",
    title: "Una pregunta activa toda la cadena.",
    target: 405,
    note: "Panel y chat usan el mismo backend de valoración de oferta. El servicio devuelve estado, versión, intervalo y SHAP opcional. SSE permite respuesta progresiva. La demo del TFM guarda un historial y unos favoritos globales en Supabase, compartidos entre visitantes. El perfil se configura en el navegador; al activar Notificaciones se guarda una copia en Supabase para preparar la selección diaria. La bandeja se identifica mediante una cookie propia de ese navegador, sin cuenta de usuario. Si una fuente falla o falta soporte, se informa y se evita presentar respaldo ilustrativo como evidencia.",
  },
  {
    kicker: "Roadmap",
    title: "Demostrar. Validar. Escalar.",
    target: DEMO_START_SECONDS,
    note: "Comprar o alquilar y las selecciones diarias ya están disponibles. Notificaciones permite activar hasta tres viviendas según el perfil guardado, a las 07:00 de Europe/Madrid por defecto, con horario editable. La configuración y el acceso a la bandeja pertenecen a ese navegador, sin autenticación de usuario. La bandeja se prepara con la app cerrada; el aviso del navegador solo funciona con ella abierta y permiso. No hay correo ni push en segundo plano. Quedan por validar la utilidad con usuarios, la integración multiportal y la expansión a más ciudades.",
  },
  {
    kicker: "Demo · historia y recorrido",
    title: "Así se convierte una búsqueda en una decisión.",
    target: DEMO_START_SECONDS + DEMO_SECONDS,
    note: "Un único vídeo une la historia conceptual de João con capturas de la aplicación actual y datos de ejemplo. La historia ilustra la propuesta; no es una prueba de resultados. En la demo, explica la elección de alquiler o compra, la ruta al trabajo, el desglose del Score, Cómo funciona y la gráfica patrimonial. Destaca el capital que permanece invertido en cada alternativa. La parte de João conserva su audio; el recorrido de la aplicación se explica en directo. Los enlaces permiten abrir el producto al terminar.",
  },
  {
    kicker: "Conclusión",
    title: "La herramienta que echábamos en falta",
    target: CLOSING_TARGET_SECONDS,
    note: "Cierra con tres contribuciones: protocolo retrospectivo trazable, transformación compartida entre entrenamiento y servicio, y producto que explica resultados y abstenciones. No prometer ahorro o precisión actual sin medirlos. El valor está en unir evidencia, incertidumbre y utilidad de forma defendible.",
  },
  {
    kicker: "Propuesta de valor",
    title: "Seis capacidades. Una decisión.",
    target: CLOSING_TARGET_SECONDS,
    note: "La ventaja propuesta está en combinar las capas. Hoy se integra Idealista con fuentes de contexto, scoring, conversación y selección diaria de hasta tres viviendas por perfil guardado. El horario inicial es 07:00 de Europe/Madrid y se puede editar en Notificaciones. La bandeja pertenece a ese navegador, sin cuenta de usuario; no es correo ni push con la app cerrada. La integración multiportal sigue pendiente.",
  },
  {
    kicker: "Problema y propuesta",
    title: "Precio, confianza y encaje",
    target: CLOSING_TARGET_SECONDS,
    note:
      "El comprador solo ve el promedio de una zona, aunque dos pisos del mismo barrio puedan ser radicalmente distintos. HabitIA responde tres preguntas: qué precio cabe esperar, cuánto puede variar y qué vivienda encaja con la persona. La estimación usa el modelo, el rango expresa la incertidumbre y el Score ordena según las preferencias. Son tres conceptos distintos.",
  },
  {
    kicker: "Aplicación del máster",
    title: "22 asignaturas, una cadena de decisión",
    target: CLOSING_TARGET_SECONDS,
    note:
      "No intentamos marcar veintidós casillas. Organizamos lo aprendido en cuatro capas: ingeniería, modelización, IA y producto. También justificamos qué no usar: 94.000 filas tabulares no necesitaban Spark, una RNN ni deep learning; y la persistencia relacional favorecía PostgreSQL frente a NoSQL.",
  },
  {
    kicker: "Resultados · decisión",
    title: "Barato no es lo mismo que infravalorado",
    target: CLOSING_TARGET_SECONDS,
    note: "La regla compara el precio anunciado con el intervalo del modelo. El contraste de rentabilidad anterior comparte PRICE en su denominador, por lo que no constituye una validación económica independiente. No llamar ahorro observado a una brecha estimada. La revisión externa de candidatos, comparables y precios de cierre queda pendiente.",
  },
  {
    kicker: "Qué utiliza el modelo",
    title: "El precio tiene más de una explicación.",
    target: CLOSING_TARGET_SECONDS,
    note: "Las importancias se recalculan desde los valores SHAP nativos del experimento revisado, promediando magnitudes por grupo exterior. Se muestran las seis variables principales y el resto agrupado. Son atribuciones en escala logarítmica normalizadas, no efectos causales ni proporciones del precio. Hasta terminar el experimento no se muestran porcentajes nuevos.",
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

export function Presentation() {
  const [active, setActive] = useState(0);
  const [started, setStarted] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
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

  const next = useCallback(() => goTo(Math.min(MAIN_SCENE_COUNT - 1, active + 1)), [active, goTo]);
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
    if (active !== 12) videoRef.current?.pause();
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
      if (target?.closest("video")) return;
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
      <a className={styles.skipLink} href="#presentation-controls">
        Ir a los controles
      </a>

      <div className={styles.ambient} aria-hidden>
        <span />
        <span />
      </div>

      <div className={styles.sceneStack} aria-live="polite">
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
                <p className={styles.kickerLight}>Defensa · 10 minutos</p>
                <h1 className={styles.openingTitle}>
                  Encontrar piso.
                  <br />
                  Entender la decisión.
                </h1>
                <p className={styles.openingSubtitle}>Datos + scoring + IA conversacional</p>
                <p className={styles.openingByline}>
                  Mauricio Peón García · João Paulo Nogueira Cunha · Manuel Macedo Púlido
                  <br />
                  Aldo Mauricio Ress Villets · Tomás Pérales Lara
                </p>
              </div>
              <button type="button" className={styles.beginButton} onClick={begin}>
                <ArrowRight aria-hidden size={18} />
                {started ? "Continuar presentación" : "Comenzar presentación"}
                <span>10 min</span>
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
          <section className={`${styles.sceneCanvas} ${styles.clearScene} ${styles.visualScene}`}>
            <SceneHeader kicker="La propuesta de HabitIA" title="Una vivienda no se entiende aislada." />
            <ProductConcept active={active === 2} />
          </section>
        </SceneShell>

        <SceneShell index={3} active={active} state={sceneState(3)} label={SCENES[3].title}>
          <section className={`${styles.sceneCanvas} ${styles.clearScene}`}>
            <SceneHeader kicker="El ranking personalizado" title="Tus prioridades cambian el orden." />
            <div className={styles.scoreStory}><div><span className={styles.overline}>Primero, filtrar</span><h3>Lo que necesitas.</h3><p>Zona, operación, presupuesto y habitaciones definen los candidatos.</p><div className={styles.preferenceChips}><span>Chamberí</span><span>Hasta 1.500 €/mes</span><span>Alquiler</span></div><small>Perfil de ejemplo</small></div><ArrowRight aria-hidden /><div><span className={styles.overline}>Después, ordenar</span><h3>Lo que te importa.</h3><p>Presupuesto, trayecto, requisitos y estimación disponible.</p><div className={styles.scoreOutput}><strong>0–100</strong><span>Encaje personalizado<br />Hasta 5 recomendaciones</span></div></div></div>
            <div className={styles.lesson}><Gauge aria-hidden /><p><strong>El Score compara el encaje con tu perfil.</strong> No es una probabilidad de acierto ni una garantía de inversión.</p></div>
          </section>
        </SceneShell>

        <SceneShell index={4} active={active} state={sceneState(4)} label={SCENES[4].title}>
          <section className={`${styles.sceneCanvas} ${styles.clearScene} ${styles.visualScene}`}>
            <SceneHeader kicker="01 · Preparar los datos" title="De los anuncios a un protocolo trazable." />
            <DataPartition active={active === 4} />
          </section>
        </SceneShell>

        <SceneShell index={5} active={active} state={sceneState(5)} label={SCENES[5].title}>
          <section className={`${styles.sceneCanvas} ${styles.clearScene}`}>
            <SceneHeader kicker="02 · Evaluación retrospectiva" title="Aprender, calibrar y evaluar por separado." />
            <div className={styles.examSplit}><article><span>Evaluación agrupada</span><strong>3 × 3</strong><p>Tres grupos exteriores y selección en tres grupos internos.</p></article><div className={styles.examDivider}><ShieldCheck aria-hidden /><span>Separación<br />por activo</span></div><article><span>Artefacto conservado</span><strong>{formatCount(results.sample.test)}</strong><p>Registros reservados en su partición fija histórica.</p></article></div>
            <div className={styles.validationChecks}><span><Check aria-hidden /> Estadísticas ajustadas solo donde corresponde</span><span><Check aria-hidden /> Calibración separada por activo</span><span><Check aria-hidden /> Mismo transformador en el servicio</span></div>
            <p className={styles.takeaway}><strong>El histórico ya fue explorado.</strong> La revisión mejora el protocolo; no crea datos externos nuevos.</p>
          </section>
        </SceneShell>

        <SceneShell index={6} active={active} state={sceneState(6)} label={SCENES[6].title}>
          <section className={`${styles.sceneCanvas} ${styles.clearScene} ${styles.visualScene}`}>
            <SceneHeader kicker="03 · Elegir el modelo" title="Del barrio a cada vivienda." />
            <ModelEvidence active={active === 6} />
          </section>
        </SceneShell>

        <SceneShell index={7} active={active} state={sceneState(7)} label={SCENES[7].title}>
          <section className={`${styles.sceneCanvas} ${styles.clearScene} ${styles.visualScene}`}>
            <SceneHeader kicker="04 · Expresar la incertidumbre" title="Un precio estimado necesita un margen." />
            <UncertaintyEvidence active={active === 7} />
          </section>
        </SceneShell>

        <SceneShell index={8} active={active} state={sceneState(8)} label={SCENES[8].title}>
          <section className={`${styles.sceneCanvas} ${styles.clearScene} ${styles.visualScene}`}>
            <SceneHeader kicker="05 · Conocer los límites" title="¿Hasta dónde llega la precisión?" />
            <ScopeEvidence active={active === 8} />
          </section>
        </SceneShell>

        <SceneShell index={9} active={active} state={sceneState(9)} label={SCENES[9].title}>
          <section className={styles.sceneCanvas}>
            <SceneHeader kicker="Comprar vs. alquilar" title="Compara todo tu patrimonio." />

            <div className={styles.financePremise}><span>Mismo capital inicial</span><ArrowRight aria-hidden /><strong>Dos escenarios, año a año</strong><ArrowRight aria-hidden /><span>Patrimonio neto</span></div>
            <div className={styles.comparisonGrid}>
              <article><span className={styles.overline}>Comprar</span><h3>Vivienda + inversión</h3><p>Entrada y gastos reducen la cartera inicial.<br />El capital restante sigue invertido.<br />Hipoteca, impuestos y costes de la vivienda.<br />Vivienda neta de deuda, gastos e impuestos de venta.</p></article>
              <article><span className={styles.overline}>Alquilar</span><h3>Capital + inversión</h3><p>Capital invertido tras los gastos iniciales.<br />Alquiler y sus subidas.<br />Misma rentabilidad esperada de la cartera.<br />Impuestos e inflación según tus supuestos.</p></article>
            </div>
            <p className={styles.takeaway}><strong>Tu capital también cuenta.</strong> En ambos escenarios se invierte la diferencia de gasto anual.</p>
            <p className={styles.finePrint}>Simulación bajo supuestos ajustables, con año de equilibrio y sensibilidad. No garantiza rentabilidades futuras.</p>
          </section>
        </SceneShell>

        <SceneShell index={10} active={active} state={sceneState(10)} label={SCENES[10].title}>
          <section className={`${styles.sceneCanvas} ${styles.clearScene}`}>
            <SceneHeader kicker="Del modelo al producto" title="Una pregunta activa toda la cadena." />
            <blockquote className={styles.questionHero}>«¿Qué pisos encajan conmigo<br />y por qué?»</blockquote>
            <ol className={styles.productChain}><li><Sparkle aria-hidden /><span>Entender</span><p>El agente interpreta tu petición.</p></li><li><Database aria-hidden /><span>Consultar</span><p>Obtiene viviendas y contexto.</p></li><li><ChartLineUp aria-hidden /><span>Comparar</span><p>Valora y ordena las opciones.</p></li><li><Eye aria-hidden /><span>Explicar</span><p>Devuelve razones comprensibles.</p></li></ol>
            <p className={styles.takeaway}>La IA conecta las herramientas. <strong>Los datos sostienen la respuesta.</strong></p>
          </section>
        </SceneShell>

        <SceneShell index={11} active={active} state={sceneState(11)} label={SCENES[11].title}>
          <section className={styles.sceneCanvas}>
            <SceneHeader kicker="Roadmap" title="Demostrar. Validar. Escalar." />

            <div className={styles.roadmapGrid}>
              <article><span className={styles.statusPill}>Prototipo disponible</span><h3>Demostrar<br />inteligencia.</h3><ul><li>Idealista + fuentes de contexto</li><li>Scoring, valoración y chatbot</li><li>Comprar vs. alquilar</li><li>Selección diaria · hasta tres viviendas</li></ul></article>
              <article><span className={styles.overline}>Siguiente · MVP</span><h3>Validar<br />con usuarios.</h3><ul><li>Medir utilidad y tiempo ahorrado</li><li>Integración multiportal</li><li>Validar las selecciones diarias</li><li>Validación del servicio B2C</li></ul></article>
              <article><span className={styles.overline}>Visión</span><h3>Escalar<br />el producto.</h3><ul><li>Más ciudades</li><li>Despliegue a empresas · B2B</li><li>Visita virtual de 2D a 3D</li><li>Predicción de revalorización</li></ul></article>
            </div>
            <p className={styles.finePrint}>Hoja de ruta propuesta, sin fechas comprometidas. La expansión requiere nuevos datos y validación local.</p>
          </section>
        </SceneShell>

        <SceneShell index={12} active={active} state={sceneState(12)} label={SCENES[12].title}>
          <section className={`${styles.sceneCanvas} ${styles.clearScene} ${styles.demoScene}`}>
            <SceneHeader kicker="Demo · historia y recorrido de la plataforma" title="Así se convierte una búsqueda en una decisión." />
            <div className={styles.demoPlayer}><video ref={videoRef} controls playsInline preload="metadata" poster="/presentacion/demo-poster.jpg"><source src="/presentacion/habitia-demo.mp4" type="video/mp4" /><track kind="captions" src="/presentacion/demo-captions.vtt" srcLang="es" label="Español" />Tu navegador no puede reproducir el vídeo.</video></div>
            <div className={styles.demoActions}><span>João: historia conceptual · Aplicación actual con datos de ejemplo</span><a href="/dashboard" target="_blank" rel="noopener noreferrer" onClick={pauseTimer}>Abrir el panel <ArrowRight aria-hidden /></a><a href="/comprar-o-alquilar" target="_blank" rel="noopener noreferrer" onClick={pauseTimer}>Abrir la calculadora <ArrowRight aria-hidden /></a></div>
          </section>
        </SceneShell>

        <SceneShell index={13} active={active} state={sceneState(13)} label={SCENES[13].title}>
          <section className={`${styles.sceneCanvas} ${styles.closingScene}`}>
            <div className={styles.closingMark}><Logo variant="mark" highlightClassName={styles.closingAccent} /></div>
            <div className={styles.closingContent}>
              <p className={styles.kicker}>Por qué creamos HabitIA</p>
              <h2>La herramienta que echábamos en falta.</h2>
              <p className={styles.closingStory}>Creamos HabitIA porque también hemos sufrido la búsqueda de piso.</p>
              <p className={styles.closingPromise}>Para encontrarlo y acertar, de forma más fácil y rápida.</p>
            </div>
            <footer className={styles.thankYou}>
              <strong>Gracias.</strong>
              <span>habitiaucm.vercel.app</span>
            </footer>
          </section>
        </SceneShell>

        <SceneShell index={14} active={active} state={sceneState(14)} label={SCENES[14].title}>
          <section className={styles.sceneCanvas}>
            <SceneHeader kicker="Propuesta de valor 360º" title="Seis capacidades. Una decisión." />

            <div className={styles.valueGrid}>
              {[
                ["01", "Centraliza", "Anuncios y contexto en un punto de entrada."],
                ["02", "Agiliza", "Prioriza opciones relevantes para tu búsqueda."],
                ["03", "Entiende", "Convierte preferencias en criterios comparables."],
                ["04", "Explica", "Hace visible el porqué de cada recomendación."],
                ["05", "Anticipa", "Hasta tres viviendas diarias en tu bandeja; 07:00, horario editable."],
                ["06", "Personaliza", "Adapta el ranking a lo que te importa."],
              ].map(([n, title, copy]) => <article key={n}><span>{n}</span><h3>{title}</h3><p>{copy}</p></article>)}
            </div>
            <p className={styles.takeaway}>La ventaja está en <strong>combinar datos, valoración y conversación.</strong></p>
          </section>
        </SceneShell>

        <SceneShell index={15} active={active} state={sceneState(15)} label={SCENES[15].title}>
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

        <SceneShell index={16} active={active} state={sceneState(16)} label={SCENES[16].title}>
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

        <SceneShell index={17} active={active} state={sceneState(17)} label={SCENES[17].title}>
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

        <SceneShell index={18} active={active} state={sceneState(18)} label={SCENES[18].title}>
          <section className={`${styles.sceneCanvas} ${styles.clearScene} ${styles.visualScene}`}>
            <SceneHeader kicker="Anexo · Interpretabilidad" title="El precio tiene más de una explicación." />
            <ExplanationEvidence active={active === 18} />
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
          <span>{active < MAIN_SCENE_COUNT ? `${String(active + 1).padStart(2, "0")} / ${MAIN_SCENE_COUNT}` : `Anexo ${active - MAIN_SCENE_COUNT + 1}`}</span>
          <select className={styles.scenePicker} aria-label="Ir a una sección o anexo" value={active} onChange={(event) => goTo(Number(event.target.value))}>
            <optgroup label="Presentación">{SCENES.slice(0, MAIN_SCENE_COUNT).map((scene,i)=><option key={scene.title} value={i}>{String(i+1).padStart(2,'0')} · {scene.kicker}</option>)}</optgroup>
            <optgroup label="Anexos para preguntas">{SCENES.slice(MAIN_SCENE_COUNT).map((scene,i)=><option key={scene.title} value={i+MAIN_SCENE_COUNT}>{scene.kicker}</option>)}</optgroup>
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
        <button type="button" onClick={next} disabled={active >= MAIN_SCENE_COUNT - 1} aria-label="Escena siguiente" title="Siguiente (→)">
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
