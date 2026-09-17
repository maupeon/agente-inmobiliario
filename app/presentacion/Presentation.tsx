"use client";

import {
  ArrowLeft,
  ArrowRight,
  ArrowsOut,
  Check,
  NotePencil,
  Pause,
  Play,
  Timer,
  List,
  X,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { PricingMethod, ScoreMethod, ScoreEquation, PresentationArchitecture, PredictorDetails } from "./PresentationMethods";
import { Logo } from "@/components/ui/Logo";
import styles from "./presentation.module.css";

const TOTAL_SECONDS = 10 * 60;

interface SceneDefinition {
  kicker: string;
  title: string;
  target: number;
  note: string;
}

const MAIN_SCENE_COUNT = 12;
const DEMO_SCENE_INDEX = 9;
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
    "note": "Fotocasa Research, Experiencia en alquiler en 2025: el 43% de los inquilinos efectivos necesitó más de dos meses para encontrar vivienda de alquiler. España; artículo del 12 de agosto de 2025. No es una media de tiempo ni un dato de compra. HabitIA busca reducir el esfuerzo; el ahorro todavía no se ha medido."
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
    "note": "Seguir recogida, EDA, modelado, plataforma, despliegue, chat y automatización. El modelo de valoración es XGBoost, con 21 variables y métricas declaradas de validación cruzada y test de 2018. El paquete de inferencia no incluye particiones, tamaño de test ni el cuaderno de selección; la memoria remite al repositorio del modelo para documentar el entrenamiento. No atribuirle la evaluación agrupada ni los intervalos del LightGBM anterior. Las variables de barrio incluyen fuentes posteriores a 2018; no presentar este test como validación temporal externa. El servicio Python y la web intercambian datos mediante la API 3.3.0."
  },
  {
    "kicker": "Motor de decisión",
    "title": "Filtrar calcular y ordenar",
    "target": 305,
    "note": "El diseño del Score combina Fair, Opportunity, Zone y Lifestyle con los pesos elegidos por el usuario. El predictor XGBoost v3 devuelve precio y desviación sin bandas calibradas. El código actual calcula Fair con una escala lineal provisional de la desviación. Opportunity compara la misma variación anual de oferta de venta del distrito frente a Madrid en compra y alquiler. Zone promedia cuatro indicadores disponibles con un peso del 25% cada uno. Con todos los componentes calculables, la cobertura es 100%; los pesos ausentes no se redistribuyen. La propuesta v12 del anexo plantea transformar las brechas en percentiles, todavía sin implementar. Los indicadores del modelo de precio no equivalen a un Zone Score calculado."
  },
  {
    "kicker": "Modelo de pricing",
    "title": "El verdadero valor del inmueble según sus características",
    "target": 360,
    "note": "Modelo de valoración: arboles_desplegable_ajustado, XGBoost, paquete v3. 21 variables, 410 árboles, profundidad máxima 12. La predicción base es exp(predicción logarítmica) por 1,0167794824519134, corrección de Duan. Estima precios anunciados de 2018; no precios de cierre ni un valor verdadero. MdAPE 9,2990% y error absoluto mediano (MdAE) de 23.708,48 euros declarados en su test de 2018. No comparar directamente estas cifras con las del experimento anterior: el paquete de inferencia no incluye las particiones ni el tamaño del test para comprobar que ambos experimentos se evaluaron en las mismas condiciones. El titular expresa el objetivo del producto; el resultado sigue siendo una estimación. La entrega habitia_predictor incorpora un escenario proyectado a 2026; las últimas fuentes observadas son venta de 2025 y alquiler de 2024. Los 410 árboles no cambian; se actualizan los índices y el alquiler relativo de barrio. El factor de venta es distrital y no debe confundirse con el IPV autonómico. Año objetivo y año observado son distintos; esta proyección no valida la precisión en anuncios de 2026. El paquete implementado funciona así: venta: multiplica la estimación base por indice_venta del distrito proyectado a 2026; no aplicar el factor heredado 1,5534 ni el IPV autonómico de 2026. Alquiler: multiplica el precio indexado por factor_renta_mensual del distrito proyectado a 2026; el factor ya es mensual y no se divide de nuevo entre 12. Esa mensualidad es un escenario derivado sin validación independiente de alquiler. No hay intervalos ni SHAP exportados, y el ajuste de nivel no demuestra precisión actual."
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
    "note": "Vídeo de 106 segundos con música continua de João y capturas con datos de ejemplo. Arranca al entrar; sus controles permiten pausar, buscar y ampliar. Al regresar conserva el punto alcanzado. Revisión v9: resultados, ficha, desglose y metodología actualizados entre 68 y 94 segundos. Capturas de la aplicación en una instancia aislada con la respuesta de valoración XGBoost y ruta OpenRouteService guardada en v8. Vivienda ficticia de compra en Centro: Fair 100, Opportunity 52,8, Zone 50,6 y Lifestyle 86,7; HabitIA Score 73 y cobertura del 100%. Zone utiliza cuatro indicadores al 25%. La ruta de bici contiene 163 coordenadas y dura 17 minutos. Opportunity utiliza el mismo indicador de venta en compra y alquiler. De 94 a 106 segundos, el gráfico completo compara 18 años con equilibrio a los 9,8; patrimonio final de compra 338.318 euros y alquiler 292.153 euros de hoy. Son los supuestos editables de ejemplo; solo se amplía el horizonte a 18 años para centrar el cruce en el vídeo. Las escalas lineales actuales no son los percentiles propuestos en el anexo. No utilizar el vídeo como prueba de resultados del modelo XGBoost."
  },
  {
    "kicker": "Roadmap",
    "title": "Demostrar validar y escalar",
    "target": 551,
    "note": "Hasta cinco viviendas diarias. El modelo de valoración ya está disponible y el código integra la API del predictor XGBoost v3. Verificar el despliegue y la conexión, y validar utilidad con usuarios reales y precisión con datos actuales. Futuro: revalorización, visita 2D a 3D, más ciudades, B2C y B2B."
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
    "note": "Diseño v12 pendiente de implementación. Fair y Opportunity proponen percentiles de las brechas respecto a una distribución de referencia por fijar, independiente de la evaluación final. No usar el test reservado para diseñar el Score. Zone requiere indicadores entre 0 y 1, con orientación y ausencias resueltas; las variables de barrio de XGBoost no lo implementan por sí mismas. Lifestyle usa el negativo de los minutos y las viviendas filtradas como referencia; resolver empates y el caso de una vivienda. El código actual usa escalas lineales provisionales para Fair y Opportunity; no implementa los percentiles v12. Fair compara importes del anuncio y del modelo. Opportunity utiliza la misma variación anual de oferta de venta del distrito frente a Madrid en compra y alquiler. Zone promedia cuatro indicadores al 25%. Lifestyle mantiene la función por minutos. La cobertura alcanza el 100% cuando todos los componentes tienen datos; no se redistribuyen pesos ausentes."
  },
  {
    "kicker": "Anexo · Arquitectura",
    "title": "Arquitectura del producto",
    "target": 561,
    "note": "La web y el backend Next.js están planteados en Vercel; el servicio Python/FastAPI en Fly.io; PostgreSQL y automatizaciones en Supabase; Claude mediante Anthropic. Panel y chat usan herramientas compartidas. La API de XGBoost v3 conecta la web con el servicio: carga el predictor una vez, prepara 21 variables y devuelve precio base de 2018, precio de venta indexado y renta derivada con sus periodos explícitos; ambos se proyectan a 2026 con últimas fuentes de venta de 2025 y alquiler de 2024, conservando las advertencias por anuncio. No entrena durante la búsqueda, no exporta intervalos ni SHAP. La aplicación deriva Fair de sus importes mediante una escala provisional. Si el nuevo modelo se abstiene, Fair queda ausente y baja la cobertura del score global; no se redistribuyen los pesos. Las estimaciones antiguas no alimentan el Fair vigente. El adaptador 3.3 admite venta y alquiler; el paquete original del predictor admite anuncios de venta. Claude interpreta y explica los resultados. La incorporación en código no sustituye a comprobar la conexión del despliegue. Historial y favoritos de la demo son compartidos; el perfil vive en el navegador y las notificaciones se identifican con su cookie."
  },
  {
    "kicker": "Anexo · Modelo de valoración",
    "title": "XGBoost en detalle",
    "target": 561,
    "note": "Fuente: metadatos.json del paquete arboles_desplegable_ajustado v3. Se conserva una copia exacta en predictor-metadata.json. Test de 2018: error porcentual mediano 9,2990450726%; error absoluto mediano 23.708,4844 euros; MAE 49.220,1987 euros; RMSE log 0,1856103494; R² log 0,9398942152; 80,5551874917% con error dentro de ±20%. Ese 80,56% es una proporción observada: no un intervalo de predicción ni probabilidad individual de acierto. RMSE y R² están en escala logarítmica. Los metadatos también declaran RMSE log de validación cruzada 0,1857717187. El paquete de inferencia no incorpora particiones, tamaño del test ni cuaderno de selección; la memoria remite al repositorio del modelo para documentar el entrenamiento. La integración web no repite esa evaluación. 21 variables: 4 de tamaño/distribución/planta, 11 de equipamiento/tipología, 3 distancias y 3 del barrio. El top 5 de la diapositiva de pricing se ha calculado sobre los 410 árboles exportados por ganancia media de cada variable: superficie, baños, alquiler mediano del barrio, índice de vulnerabilidad y ascensor. No son atribuciones SHAP ni efectos causales. El dominio de producción descarta viviendas mayores de 367 m², casas/chalets y descripciones de viviendas a reformar u ocupadas/alquiladas. La obra nueva conserva la estimación con advertencia; los anuncios de una promoción no son observaciones independientes. El histórico de entrenamiento registra superficies mayores: las métricas entregadas no detallan el resultado del subconjunto admitido en producción. El modelo omite conservación, condición de ático y vistas; parte del equipamiento depende de lo que describa el anuncio. Fuentes de barrio posteriores a 2018 limitan la lectura temporal. Índices de venta y alquiler y variable relativa de alquiler de barrio proyectados a 2026, con últimas fuentes de venta de 2025 y alquiler de 2024. Entrenamiento y métricas siguen correspondiendo a 2018; alquiler sin validación propia. No afirmar superioridad frente a LightGBM sin una comparación común."
  }
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
  const [chromeVisible, setChromeVisible] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const slidePanelRef = useRef<HTMLDialogElement>(null);
  const slidePanelTriggerRef = useRef<HTMLButtonElement>(null);
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

  const next = useCallback(() => goTo(active + 1), [active, goTo]);
  const previous = useCallback(() => goTo(active - 1), [active, goTo]);

  useEffect(() => {
    document.querySelector(`[data-scene="${active}"] section`)?.scrollTo({ top: 0 });
  }, [active]);

  const togglePause = useCallback(() => {
    if (running) pauseTimer();
    else startTimer();
  }, [pauseTimer, running, startTimer]);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen();
  }, []);

  const openSlidePanel = useCallback(() => {
    const panel = slidePanelRef.current;
    if (!panel || panel.open) return;
    panel.showModal();
    const current = panel.querySelector<HTMLButtonElement>('[aria-current="step"]');
    current?.focus({ preventScroll: true });
    current?.scrollIntoView({ block: "nearest" });
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (active !== DEMO_SCENE_INDEX) {
      video.pause();
      return;
    }
    void video.play().catch(() => {});
    return () => video.pause();
  }, [active]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (slidePanelRef.current?.open) return;
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
      if (isEditable || target?.closest("video") || event.metaKey || event.ctrlKey || event.altKey) return;

      if (shortcut === "i") {
        event.preventDefault();
        openSlidePanel();
        return;
      }

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
  }, [active, begin, goTo, next, notesOpen, openSlidePanel, previous, started, toggleFullscreen, togglePause]);

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
    <main className={styles.presentation} data-motion="reduced" data-started={started} data-active={active} data-closing={active === MAIN_SCENE_COUNT - 1}>
      <a className={styles.skipLink} href="#presentation-controls" onClick={() => setChromeVisible(true)}>
        Ir a los controles
      </a>

      <div className={styles.ambient} aria-hidden>
        <span />
        <span />
      </div>

      <div className={styles.sceneStack} aria-live="polite" onClick={(event) => {
        if ((event.target as HTMLElement).closest("button, a, input, select, textarea, video, [data-presentation-interactive]")) return;
        event.preventDefault();
        next();
      }}>
        <SceneShell index={0} active={active} state={sceneState(0)} label={SCENES[0].title}>
          <section className={`${styles.openingScene} ${styles.sceneCanvas}`}>
            <div className={styles.opening}>
              <div className={styles.openingMeta}>
                <Logo
                  variant="inline"
                  className={styles.slideLogo}
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
                  Aldo Mauricio Ress Villets · Tomás Perales Lara
                </p>
              </div>
              <p className={styles.advanceHint}>→ o clic para avanzar · ← para volver · I diapositivas · F pantalla completa · H controles</p>
            </div>
          </section>
        </SceneShell>

        <SceneShell index={1} active={active} state={sceneState(1)} label={SCENES[1].title}>
          <section className={`${styles.sceneCanvas} ${styles.clearScene} ${styles.problemScene}`}>
            <SceneHeader kicker="El problema" title="Buscar agota. Decidir exige contexto." />

            <div className={styles.problemLayout}>
              <div>
                <div className={styles.editorialRows}>
                {[
                  ["01", "Oferta fragmentada", "Saltar entre portales, repetir filtros y comparar anuncios."],
                  ["02", "Demasiadas variables", "Precio, estado, barrio, trayecto y financiación compiten por tu atención."],
                  ["03", "Referencias incompletas", "El precio anunciado no explica cuánto encaja una vivienda."],
                  ["04", "Tiempo e incertidumbre", "Encontrar opciones es solo el comienzo de la decisión."],
                ].map(([n, title, copy]) => <article key={n}><span>{n}</span><div><h3>{title}</h3><p>{copy}</p></div></article>)}
              </div>
              </div>
              <div className={styles.problemStatistic}>
                <strong>43<span>%</span></strong>
                <p>de los inquilinos tardó <b>más de dos meses</b> en encontrar vivienda de alquiler</p>
                <small><a href="https://www.fotocasa.es/fotocasa-life/alquiler/tiempo-medio-para-alquilar-vivienda-en-espana-2025/" target="_blank" rel="noreferrer">Fotocasa Research · Experiencia en alquiler en 2025</a><br />España · inquilinos que consiguieron alquilar</small>
              </div>
            </div>
          </section>
        </SceneShell>

        <SceneShell index={2} active={active} state={sceneState(2)} label={SCENES[2].title}>
<section className={`${styles.sceneCanvas} ${styles.clearScene}`}><SceneHeader kicker="Oportunidad · estudio de mercado" title="Conectar lo que hoy consultamos por separado." /><div className={styles.marketTable}><table><thead><tr><th>Soluciones revisadas</th><th>Qué aportan</th><th>Nuestra oportunidad</th></tr></thead><tbody><tr><td><a href="https://www.idealista.com/info/aviso-via-mail?tipo=sms" target="_blank" rel="noreferrer">Idealista</a> · <a href="https://www.fotocasa.es/es" target="_blank" rel="noreferrer">Fotocasa</a></td><td>Búsqueda de compra y alquiler, filtros y alertas</td><td>Priorizar por preferencias explícitas</td></tr><tr><td><a href="https://www.idealista.com/tools/centrodeayuda/articulos/estimar-el-precio-de-un-inmueble/" target="_blank" rel="noreferrer">Herramientas de valoración</a></td><td>Estimación y comparables del inmueble</td><td>Conectar precio, trayecto y explicación</td></tr><tr><td><a href="https://www.ocu.org/vivienda-y-energia/comprar-vender-alquilar/consejos/alquilar-o-comprar/" target="_blank" rel="noreferrer">Comparación económica</a></td><td>Costes y alternativas de inversión</td><td>Integrar la decisión patrimonial en la búsqueda</td></tr></tbody></table></div><p className={styles.takeaway}>El hueco que exploramos: <strong>búsqueda, ranking, asistente conversacional y viabilidad financiera en un mismo recorrido.</strong></p></section>
        </SceneShell>

        <SceneShell index={3} active={active} state={sceneState(3)} label={SCENES[3].title}>
<section className={`${styles.sceneCanvas} ${styles.clearScene}`}><SceneHeader kicker="Solución" title="De repetir búsquedas a entender tus opciones." /><div data-build-group className={styles.journeyRows}><article><span>Hoy</span><ol><li>Repetir filtros</li><li>Abrir muchos anuncios</li><li>Comparar a mano</li><li>Calcular gastos aparte</li><li>Decidir con dudas</li></ol></article><article><span>Con HabitIA</span><ol><li>Definir tu perfil</li><li>Recibir hasta 5 viviendas</li><li>Entender el encaje</li><li>Simular tu patrimonio</li><li>Decidir con contexto</li></ol></article></div><div className={styles.promiseRow}><strong>Nuestro objetivo: ahorrar tiempo y esfuerzo al encontrar tu piso</strong></div></section>
        </SceneShell>

        <SceneShell index={4} active={active} state={sceneState(4)} label={SCENES[4].title}>
<section className={`${styles.sceneCanvas} ${styles.clearScene}`}><SceneHeader kicker="Propuesta de valor" title="Todo el recorrido, en HabitIA." /><div data-build-group className={styles.valueGrid}><article><span>01</span><h3>Compra y alquiler</h3><p>Un portal para ambas búsquedas; anuncios de Idealista.</p></article><article><span>02</span><h3>Top 5 para ti</h3><p>Hasta cinco viviendas ordenadas por tu HabitIA Score.</p></article><article><span>03</span><h3>Un chat que explica</h3><p>Pregunta por las viviendas, los criterios y los resultados.</p></article><article><span>04</span><h3>Búsqueda diaria</h3><p>Automatiza el recomendador con tu perfil y horario.</p></article><article><span>05</span><h3>Comprar vs. alquilar</h3><p>Compara vivienda, deuda, cartera, gastos, impuestos e inflación.</p></article></div><p className={styles.takeaway}>De encontrar opciones a <strong>entender la decisión completa.</strong></p></section>
        </SceneShell>

        <SceneShell index={5} active={active} state={sceneState(5)} label={SCENES[5].title}>
<section className={`${styles.sceneCanvas} ${styles.clearScene}`}><SceneHeader kicker="Metodología · del máster al producto" title="Una técnica para cada paso." /><div data-build-group className={styles.methodGrid}><article><span>01</span><h3>Recoger</h3><p>Anuncios históricos y fuentes de contexto.</p><small>Python · SQL · Linux / Git</small></article><article><span>02</span><h3>Explorar</h3><p>Calidad, duplicados, ausencias y distribución.</p><small>Estadística · Minería de datos</small></article><article><span>03</span><h3>Modelar</h3><p>XGBoost, 21 variables, evaluación histórica y ajuste por distrito.</p><small>Machine Learning · Data science</small></article><article><span>04</span><h3>Construir y desplegar</h3><p>Servicio Python, interfaz y persistencia.</p><small>Productivización · Visualización · BI</small></article><article><span>05</span><h3>Conversar</h3><p>Interpretar preguntas y conectar herramientas.</p><small>NLP · Modelos generativos</small></article><article><span>06</span><h3>Automatizar</h3><p>Selección diaria, caché, cuota y reintentos.</p><small>SQL · Ingeniería de workflows</small></article></div></section>
        </SceneShell>

        <SceneShell index={6} active={active} state={sceneState(6)} label={SCENES[6].title}>
          <section className={`${styles.sceneCanvas} ${styles.clearScene}`}>
            <SceneHeader kicker="Motor de decisión · diseño del Score" title="Filtrar, calcular y ordenar." />
            <div className={styles.scoreFormula}><ScoreEquation /></div>
            <div data-build-group className={styles.scoreComponents}>
              <article><h3>Fair · precio</h3><p>Cómo de justo es el precio al comparar su valor estimado con la oferta.</p></article>
              <article><h3>Opportunity · inversión</h3><p>Revalorización de la zona frente a la media de la ciudad.</p></article>
              <article><h3>Zone · calidad de vida</h3><p>Zonas verdes, seguridad, transporte y servicios.</p></article>
              <article><h3>Lifestyle · tiempo al trabajo</h3><p>La distancia que de verdad importa al trabajo: la temporal.</p></article>
            </div>
            <p className={styles.scoreCoverage}><strong>Tú indicas cuánta importancia le das a cada métrica.</strong></p>
          </section>
        </SceneShell>

        <SceneShell index={7} active={active} state={sceneState(7)} label={SCENES[7].title}>
          <section className={`${styles.sceneCanvas} ${styles.clearScene} ${styles.pricingScene}`}>
            <SceneHeader kicker="Modelo de pricing" title="El verdadero valor del inmueble, según sus características" />
            <PricingMethod />
          </section>
        </SceneShell>

        <SceneShell index={8} active={active} state={sceneState(8)} label={SCENES[8].title}>
<section className={`${styles.sceneCanvas} ${styles.clearScene}`}><SceneHeader kicker="Comprar vs. alquilar" title="La cuota es solo una parte de la comparación." /><div data-build-group className={styles.comparisonGrid}><article><span className={styles.overline}>Comparación básica</span><h3>Precio, renta e hipoteca</h3><p>Precio de compra y entrada.<br />Alquiler mensual.<br />Tipo y plazo de la hipoteca.<br />Horizonte de la comparación.</p></article><article><span className={styles.overline}>Qué añade HabitIA</span><h3>Todo el patrimonio</h3><p>Gastos a fondo perdido: compra, mantenimiento, comunidad, IBI y seguros.<br />Revalorización del capital que puede permanecer invertido.<br />Perspectivas: horizontes temporales, situación laboral o mudanzas.</p></article></div><p className={styles.takeaway}>Compara <strong>patrimonio neto, año de equilibrio y sensibilidad</strong> con supuestos editables.</p><p className={styles.finePrint}>Las mudanzas y los cambios laborales orientan tu decisión; no se simulan automáticamente como flujos económicos.</p></section>
        </SceneShell>

        <SceneShell index={9} active={active} state={sceneState(9)} label={SCENES[9].title}>
          <section className={`${styles.sceneCanvas} ${styles.clearScene} ${styles.demoScene}`}>
            <SceneHeader kicker="Demo · HabitIA en acción" title="De la búsqueda a la decisión." />
            <div className={styles.demoPlayer}><video ref={videoRef} controls aria-label="Demostración de HabitIA" playsInline preload="metadata" poster="/presentacion/demo-poster.jpg" onPlay={(event) => { if (active !== DEMO_SCENE_INDEX) event.currentTarget.pause(); }}><source src="/presentacion/habitia-demo.mp4?v=9" type="video/mp4" /><track kind="captions" src="/presentacion/demo-captions.vtt?v=9" srcLang="es" label="Español" />Tu navegador no puede reproducir el vídeo.</video></div>
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
          <section className={`${styles.sceneCanvas} ${styles.clearScene} ${styles.scoreMethodScene}`}>
            <SceneHeader kicker="Anexo · HabitIA Score" title="Cómo se calcula cada componente." />
            <ScoreMethod />
          </section>
        </SceneShell>

        <SceneShell index={13} active={active} state={sceneState(13)} label={SCENES[13].title}>
          <section className={`${styles.sceneCanvas} ${styles.clearScene} ${styles.architectureScene}`}>
            <SceneHeader kicker="Anexo · Arquitectura" title="Una experiencia. Servicios conectados." />
            <PresentationArchitecture />
          </section>
        </SceneShell>

        <SceneShell index={14} active={active} state={sceneState(14)} label={SCENES[14].title}>
          <section className={`${styles.sceneCanvas} ${styles.clearScene} ${styles.predictorScene}`}>
            <SceneHeader kicker="Anexo · Modelo de valoración" title="XGBoost: cómo estima y dónde falla." />
            <PredictorDetails />
          </section>
        </SceneShell>
      </div>

      <button
        ref={slidePanelTriggerRef}
        type="button"
        className={styles.slidePanelTrigger}
        onClick={openSlidePanel}
        aria-haspopup="dialog"
        aria-controls="slide-navigation"
        title="Ver diapositivas (I)"
      >
        <List aria-hidden /> Diapositivas <span>{active + 1}/{SCENES.length}</span>
      </button>

      <dialog
        ref={slidePanelRef}
        id="slide-navigation"
        className={styles.slidePanel}
        aria-labelledby="slide-navigation-title"
        onClose={() => slidePanelTriggerRef.current?.focus({ preventScroll: true })}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            const bounds = event.currentTarget.getBoundingClientRect();
            if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) {
              event.currentTarget.close();
            }
          }
        }}
      >
        <div className={styles.slidePanelHeader}>
          <div><h2 id="slide-navigation-title">Diapositivas</h2><p>Elige dónde continuar.</p></div>
          <button type="button" onClick={() => slidePanelRef.current?.close()} aria-label="Cerrar panel de diapositivas"><X aria-hidden /></button>
        </div>
        <nav className={styles.slidePanelList} aria-label="Índice de diapositivas">
          {[{ label: "Presentación", start: 0, end: MAIN_SCENE_COUNT }, { label: "Anexos para preguntas", start: MAIN_SCENE_COUNT, end: SCENES.length }].map((group) => (
            <section key={group.label}>
              <h3>{group.label}</h3>
              <ol start={group.start + 1}>
                {SCENES.slice(group.start, group.end).map((scene, offset) => {
                  const index = group.start + offset;
                  return <li key={scene.title}>
                    <button type="button" aria-current={index === active ? "step" : undefined} onClick={() => {
                      goTo(index);
                      slidePanelRef.current?.close();
                    }}>
                      <span className={styles.slidePanelNumber}>{String(index + 1).padStart(2, "0")}</span>
                      <span><small>{scene.kicker}</small><strong>{scene.title}</strong></span>
                      {index === active && <Check aria-label="Diapositiva actual" />}
                    </button>
                  </li>;
                })}
              </ol>
            </section>
          ))}
        </nav>
      </dialog>

      <header
        className={`${styles.topChrome} ${chromeVisible ? "" : styles.chromeHidden}`}
        aria-hidden={!started || !chromeVisible}
        ref={(element) => { if (element) element.inert = !started || !chromeVisible; }}
      >
        <Link href="/" className={styles.exitLink}>Salir</Link>
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
      {index !== 0 && <div className={styles.slideBrand}><Logo variant="inline" className={styles.slideLogo} highlightClassName={styles.openingLogoAccent} /></div>}
      {children}
    </div>
  );
}

function SceneHeader({ kicker, title }: { kicker: string; title: React.ReactNode }) {
  return (
    <header className={styles.sceneHeader}>
      <p className={`${styles.kicker} ${styles.reveal}`} style={{ "--i": 0 } as React.CSSProperties}>{kicker}</p>
      <h2 className={styles.reveal} style={{ "--i": 1 } as React.CSSProperties}>{title}</h2>
    </header>
  );
}
