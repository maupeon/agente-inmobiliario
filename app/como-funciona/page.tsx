import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { ArchitectureGraphic } from "@/components/layout/ArchitectureGraphic";
import { SiteNav } from "@/components/layout/SiteNav";
import { Logo } from "@/components/ui/Logo";
import districtContext from "@/data/madrid/madrid-context.json";
import { MARKET_SOURCES } from "@/lib/market/presentation";

export const metadata: Metadata = {
  title: "Cómo funciona",
  description:
    "Descubre cómo HabitIA convierte tus preferencias en recomendaciones de vivienda sobre el mapa y de dónde salen sus datos.",
};

const STEPS = [
  {
    n: "01",
    t: "Tu perfil y tus prioridades",
    d: "Eliges la zona, presupuesto, trabajo e imprescindibles. Repartes 100 puntos entre precio, inversión, calidad de vida y tiempo al trabajo; de inicio, cada componente tiene 25. Puedes descartar uno dándole peso 0.",
  },
  {
    n: "02",
    t: "Recomendación “para ti”",
    d: "Buscamos candidatos con tus filtros y excluimos los incumplimientos conocidos de requisitos obligatorios. Los datos que faltan quedan pendientes de comprobar.",
  },
  {
    n: "03",
    t: "Datos con contexto",
    d: "Añadimos la estimación de precio si el modelo puede calcularla, la referencia territorial disponible y el trayecto. Cada dato conserva su origen y sus límites.",
  },
  {
    n: "04",
    t: "Mapa + explicación",
    d: "Ordenamos hasta cinco viviendas por HabitIA Score. Las tarjetas muestran los cuatro subscores y la cobertura de datos. Despliega el cálculo para consultar tus pesos y la aportación de cada factor; abre la ficha para explorar la vivienda.",
  },
];

const SIGNALS = [
  {
    t: "α · Fair · precio",
    d: "Compara el precio anunciado con la estimación individual del modelo. Escala provisional: 50 puntos si coinciden, 100 si el anuncio está un 20% o más por debajo y 0 si está un 20% o más por encima. Una media provincial no sustituye esta estimación.",
    fuente: "25% por defecto · Sin estimación: no disponible",
  },
  {
    t: "β · Opportunity · inversión",
    d: "En compra y alquiler, compara la misma variación anual de precios de oferta de venta del distrito con la de Madrid, de agosto de 2025 a agosto de 2026. Escala provisional: 50 si coinciden; suma 2,5 puntos por cada punto porcentual de ventaja, con límites 0 y 100. No predice rentabilidad futura.",
    fuente: "25% por defecto · Idealista · 21 distritos · Compra y alquiler",
  },
  {
    t: "γ · Zone · calidad de vida",
    d: "Aplica percentiles a los m² verdes, actuaciones policiales, líneas de Metro y servicios del distrito. Zone promedia estos cuatro componentes con un peso del 25% cada uno y se expresa sobre 100.",
    fuente: "25% por defecto · Zone por distrito",
  },
  {
    t: "δ · Lifestyle · tiempo al trabajo",
    d: "Puntúa el tiempo de trayecto al trabajo en tu modo de transporte: 100 puntos hasta 10 minutos, descenso de 1,9 puntos por minuto y 5 puntos desde 60 minutos. Las aproximaciones se identifican. Presupuesto e imprescindibles se aplican como filtros.",
    fuente: "25% por defecto · Necesita trabajo y tiempo de ruta",
  },
];

type Estado = "oficial" | "no disponible" | "proveedor";
const SOURCES: Array<{ fuente: string; aporta: string; estado: Estado; refresco: string; href?: string }> = [
  { fuente: "Idealista", aporta: "Anuncios: fotos, precio, m²", estado: "proveedor", refresco: "Caché de búsqueda de hasta 24 h; demo identificada" },
  { fuente: "MIVAU · Valor tasado", aporta: "Contexto provincial de compra, €/m²", estado: "oficial", refresco: "Publicación trimestral", href: MARKET_SOURCES.valuation.href },
  { fuente: "INE · IPV", aporta: "Evolución de precios de vivienda (%)", estado: "oficial", refresco: "Publicación trimestral", href: MARKET_SOURCES.ipv.href },
  { fuente: "Banco de España", aporta: "Referencias de tipos de interés", estado: "oficial", refresco: "Publicación mensual", href: MARKET_SOURCES.rates.href },
  { fuente: "OpenRouteService", aporta: "Rutas; respaldos indicados como aproximados", estado: "proveedor", refresco: "Al calcular el trayecto" },
  { fuente: "Nominatim / OpenStreetMap", aporta: "Búsqueda de ubicaciones", estado: "proveedor", refresco: "Al localizar una dirección" },
  { fuente: "Modelo XGBoost · alquiler", aporta: "Renta mensual derivada de la venta estimada y ratios distritales de 2024; sin validación independiente de alquiler", estado: "proveedor", refresco: "Al consultar una vivienda, si el modelo está disponible" },
  { fuente: "Ayuntamiento de Madrid · Zonas verdes", aporta: "Superficie municipal de zonas verdes por distrito", estado: "oficial", refresco: `Instantánea de ${districtContext.zonasVerdes.periodo}`, href: districtContext.zonasVerdes.url },
  { fuente: "Policía Municipal de Madrid", aporta: "Actuaciones por distrito; no son una tasa de criminalidad", estado: "oficial", refresco: `Instantánea de ${districtContext.seguridad.periodo}`, href: districtContext.seguridad.url },
  { fuente: "Zone · entorno", aporta: "Percentiles de cuatro componentes con igual peso", estado: "proveedor", refresco: "Cuatro indicadores disponibles por distrito" },
];

const STACK = [
  "Next.js 14 (App Router, SSR + SSE)",
  "Claude — chat y explicaciones opcionales",
  "Python + FastAPI — servicio de valoración",
  "XGBoost — venta indexada y renta mensual derivada",
  "MapLibre GL + teselas CARTO (sin clave)",
  "Supabase (Postgres) — caché y persistencia",
  "OpenRouteService — routing",
  "INE · MIVAU · Banco de España — mercado",
];

export default function ComoFuncionaPage() {
  return (
    <div className="relative z-10">
      <SiteNav />
      <main className="mx-auto w-full max-w-[1000px] px-5 pb-24 pt-10 sm:px-8">
        {/* Hero */}
        <div className="flex items-center justify-between gap-4 border-y border-ink py-2.5 font-mono text-[10px] uppercase tracking-[0.22em] text-ink">
          <span>Cómo funciona</span>
          <span className="hidden sm:inline">Arquitectura · Datos · Flujo</span>
          <span className="tabular text-stone">№ 002</span>
        </div>

        <header className="mt-10 max-w-[60ch]">
          <h1 className="font-display text-display-md text-ink">
            De tus preferencias a tu próxima vivienda.
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-stone-600">
            <Logo variant="mark" className="text-[1.1em]" /> es un agente
            inmobiliario que combina tus preferencias con los datos disponibles
            de cada vivienda. Tú decides qué pesa más; aquí puedes comprobar cómo
            se calcula el orden y qué información sigue faltando.
          </p>
        </header>

        {/* Flujo */}
        <Section eyebrow="El flujo" title="Cuatro pasos">
          <ol className="grid gap-4 sm:grid-cols-2">
            {STEPS.map((s) => (
              <li key={s.n} className="rounded-xl border border-hairline bg-paper-50 p-6">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-saffron-700 tabular">
                  {s.n}
                </p>
                <h3 className="mt-2 font-display text-xl leading-tight text-ink">{s.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">{s.d}</p>
              </li>
            ))}
          </ol>
        </Section>

        {/* Motor */}
        <Section eyebrow="El motor" title="Cómo se eligen y ordenan">
          <p className="max-w-[68ch] text-base leading-relaxed text-ink-700">
            El <Strong>HabitIA Score</Strong> es una suma ponderada de cuatro
            componentes, cada uno de 0 a 100. Los pesos α, β, γ y δ también van
            de 0 a 100 y deben sumar exactamente 100. Puedes editarlos en tu perfil;
            por defecto son 25, 25, 25 y 25. Ordenamos de mayor a menor puntuación
            los candidatos recuperados, que no representan todo el mercado.
          </p>
          <div className="mt-5 overflow-x-auto rounded-xl border border-hairline bg-paper-200 p-4 font-mono text-sm text-ink" aria-label="Fórmula del HabitIA Score">
            Score = (α × Fair + β × Opportunity + γ × Zone + δ × Lifestyle) / 100
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {SIGNALS.map((s) => (
              <div key={s.t} className="rounded-xl border border-hairline bg-paper-50 p-5">
                <h4 className="font-display text-lg leading-tight text-ink">{s.t}</h4>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">{s.d}</p>
                <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.16em] text-saffron-700">
                  {s.fuente}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-5 max-w-[72ch] text-sm leading-relaxed text-stone-600">
            <Strong>Si falta un dato, no inventamos una puntuación.</Strong>{" "}
            El componente queda sin dato, aporta cero y su peso no se reparte
            entre los demás. La cobertura indica qué porcentaje de tus pesos tiene
            datos disponibles; un score bajo puede reflejar falta de información.
            No es una probabilidad de acierto ni una valoración financiera.
          </p>
        </Section>

        <Section eyebrow="La comparación" title="Qué significan Barato, Justo y Caro">
          <p className="max-w-[72ch] text-sm leading-relaxed text-stone-600">
            Estas etiquetas comparan el anuncio con el escenario del modelo.
            «12% por debajo de la estimación» describe esa diferencia; no asegura
            un ahorro real. El modelo aprende precios de oferta de Madrid de 2018
            y su ajuste a otro periodo es un escenario indexado sin precisión actual
            validada. Si el modelo se abstiene, no clasificamos el precio individual.
            La media territorial, si existe, se muestra aparte con fuente y periodo.
          </p>
        </Section>

        <Section eyebrow="Tu búsqueda" title="Cuándo cambian los resultados">
          <div className="space-y-3 text-sm leading-relaxed text-stone-600">
            <p>Al confirmar una búsqueda se aplica tu perfil a los candidatos disponibles. Una consulta idéntica puede reutilizar anuncios durante un máximo de 24 horas para reducir consultas al proveedor; al caducar, la siguiente búsqueda vuelve a consultarlo.</p>
            <p>Cambiar tus pesos reordena las viviendas mostradas sin volver a consultar al proveedor. «Última búsqueda» recupera los filtros y resultados guardados, incluso si no hubo coincidencias. Su fecha describe cuándo buscaste, no garantiza que el anuncio siga disponible.</p>
          </div>
        </Section>

        <Section eyebrow="Tus favoritos" title="Qué ocurre con los anuncios guardados">
          <p className="max-w-[72ch] text-sm leading-relaxed text-stone-600">Los favoritos conservan una copia del anuncio. Si desaparece de Idealista, permanece guardado hasta que lo quites; no comprobamos automáticamente su disponibilidad. Abre el anuncio original para confirmarla.</p>
          <p className="mt-3 max-w-[72ch] text-sm leading-relaxed text-stone-600">Esta es una demo compartida del TFM: los favoritos y el historial de búsquedas se comparten entre visitantes. Tu perfil se configura en el navegador; la bandeja de notificaciones se identifica mediante una cookie de ese navegador.</p>
        </Section>

        <Section eyebrow="Cada mañana" title="Hasta cinco viviendas al día">
          <p className="max-w-[72ch] text-sm leading-relaxed text-stone-600">En Notificaciones puedes activar una selección diaria, editar la hora y pausarla cuando quieras. La hora inicial es 07:00, zona horaria Europe/Madrid. Se eligen hasta cinco viviendas según tu perfil y tu HabitIA Score; si hay menos candidatos, no se completa la selección con viviendas inventadas.</p>
          <p className="mt-3 max-w-[72ch] text-sm leading-relaxed text-stone-600">Cada selección muestra su fecha y el número real de viviendas: «Tu nuevo top 5 del día…». Los avisos se consultan en la bandeja de la aplicación. El aviso del navegador requiere permiso y la aplicación abierta; no se envían correos. La selección puede repetir viviendas si siguen siendo las que mejor encajan.</p>
          <p className="mt-3 max-w-[72ch] text-sm leading-relaxed text-stone-600">Al activarla autorizas una búsqueda diaria con tu perfil, respetando la caché y los límites del proveedor. Guarda los cambios en Notificaciones para actualizar ese perfil. La suscripción caduca tras 90 días sin guardar y la página muestra si el servicio está configurado.</p>
          <Link href="/notificaciones" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-ink px-4 text-sm font-medium text-paper hover:bg-ink-700">Configurar notificaciones <ArrowRight aria-hidden size={16} /></Link>
        </Section>

        {/* Datos */}
        <Section eyebrow="De dónde salen los datos" title="Fuentes, con transparencia">
          <p className="mb-5 max-w-[68ch] text-sm leading-relaxed text-stone-600">
            «Oficial» identifica la publicación de origen, no garantiza que la última descarga haya funcionado. En <Link href="/datos" className="font-medium text-saffron-700 underline underline-offset-4">Datos y fuentes</Link> puedes comprobar el periodo y el estado disponible. Los ejemplos sin trazabilidad no se usan como referencias verificadas.
          </p>
          <div className="overflow-hidden rounded-xl border border-hairline">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="bg-paper-200 font-mono text-[10px] uppercase tracking-[0.14em] text-stone">
                  <th className="px-4 py-3 font-medium">Fuente</th>
                  <th className="hidden px-4 py-3 font-medium sm:table-cell">Qué aporta</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell">Actualización</th>
                </tr>
              </thead>
              <tbody>
                {SOURCES.map((s) => (
                  <tr key={s.fuente} className="border-t border-hairline align-top">
                    <td className="px-4 py-3 font-medium text-ink">
                      {s.href ? <a href={s.href} target="_blank" rel="noopener noreferrer" className="text-saffron-700 underline underline-offset-4 hover:text-ink">{s.fuente} ↗</a> : s.fuente}
                      <span className="mt-1 block text-xs font-normal text-stone-600 sm:hidden">
                        {s.aporta}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 text-stone-600 sm:table-cell">{s.aporta}</td>
                    <td className="px-4 py-3">
                      <EstadoPill estado={s.estado} />
                    </td>
                    <td className="hidden px-4 py-3 font-mono text-[11px] text-stone md:table-cell">
                      {s.refresco}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section eyebrow="El entorno" title="Datos de barrio y distrito">
          <p className="max-w-[72ch] text-sm leading-relaxed text-stone-600">En Datos y fuentes puedes consultar población, superficie y densidad por barrio, además de zonas verdes y actuaciones policiales por distrito. La superficie verde publicada no mide proximidad a una vivienda y excluye los parques históricos, singulares y forestales del fichero separado. Las actuaciones policiales no equivalen a todos los delitos ni a una tasa de criminalidad.</p>
          <p className="mt-3 max-w-[72ch] text-sm leading-relaxed text-stone-600">Los recuentos de distrito alimentan los componentes disponibles de Zone. Se identifican como datos del distrito, no de cada barrio. Datos y fuentes incluye también el catálogo de Metro, recuentos de comercios, farmacias, gimnasios y ocio por distrito. Son referencias fechadas de distintos periodos; la puntuación es una regla de preferencia, no una medición validada de calidad de vida. En alquiler comparamos la mensualidad del anuncio con la renta derivada del predictor cuando hay datos suficientes.</p>
        </Section>

        <Section id="zone-score" eyebrow="Cuatro indicadores" title="Cómo se calcula el Zone Score">
          <p className="max-w-[72ch] text-sm leading-relaxed text-stone-600">Zone combina cuatro componentes con el mismo peso: zonas verdes, actuaciones policiales, transporte y servicios. Cada índice está entre 0 y 1 según su rango percentil entre los 21 distritos. Cada componente pesa un 25% y aporta hasta 25 puntos.</p>
          <details className="mt-4 text-sm leading-relaxed text-stone-600">
            <summary className="inline-flex min-h-11 cursor-pointer items-center font-medium text-saffron-700 underline underline-offset-4">Ver la fórmula y sus componentes</summary>
            <p className="mt-3 break-words font-mono text-ink" aria-label="Fórmula de Zone Score">Zone = 100 × (I verde + I actuaciones + I transporte + I servicios) / 4</p>
            <ul className="mt-4 list-disc space-y-2 pl-5">
              <li><Strong>Zonas verdes:</Strong> más m² verdes totales, mayor índice. Se usa el recuento publicado, sin dividirlo por población ni superficie del distrito.</li>
              <li><Strong>Actuaciones policiales:</Strong> menos actuaciones, mayor índice. Se suman las cinco categorías publicadas por distrito; una cifra menor no acredita mayor seguridad.</li>
              <li><Strong>Transporte:</Strong> más líneas distintas de Metro con estación en el distrito, mayor índice. Una línea cuenta una sola vez por distrito. No incluye autobuses ni Cercanías.</li>
              <li><Strong>Servicios:</Strong> más locales de alimentación, farmacia, gimnasio u ocio, mayor índice. Cada local cuenta una sola vez aunque tenga varias categorías; se utilizan cantidades absolutas.</li>
            </ul>
            <p className="mt-4">Los índices usan percentiles entre 0 y 1. Para actuaciones se invierte como 1 − percentil(valor). Los empates comparten el rango medio. Si falta una observación de la distribución territorial, ese indicador queda sin percentil; no se rellena con cero.</p>
          </details>
          <p className="mt-4 max-w-[72ch] text-sm leading-relaxed text-stone-600">Con los cuatro indicadores disponibles, Zone tiene una cobertura del 100% y puede alcanzar 100 puntos. Si le asignas un peso del 25% en HabitIA Score, aporta hasta 25 puntos al total. Las fuentes tienen distintos periodos, visibles en el desglose. Sin distrito de Madrid identificado en el anuncio, Zone queda sin dato.</p>
        </Section>

        {/* Arquitectura */}
        <Section eyebrow="La arquitectura" title="Qué habla con qué">
          <ArchitectureGraphic />

          <div className="mt-5 space-y-3 text-sm leading-relaxed text-stone-600">
            <p><Strong>Dónde está cada parte.</Strong> Vercel aloja la web y el backend; Fly.io aloja el servicio Python del modelo; Supabase aloja PostgreSQL; Anthropic ofrece la API de Claude. Desde el navegador puedes buscar, conversar, comparar compra y alquiler, guardar favoritos y activar avisos.</p>
            <p><Strong>El modelo ya está entrenado.</Strong> La preparación del histórico, el ajuste y la calibración se realizan fuera de la búsqueda. El servicio carga el artefacto evaluado; consultar una vivienda no vuelve a entrenarlo. El escenario indexado no acredita precisión actual en 2026.</p>
            <p><Strong>Cada pieza tiene una función.</Strong> El predictor XGBoost estima el precio anunciado a nivel de 2025 con datos de 2018. Ofrece una cifra y sus advertencias, sin intervalos calibrados ni bandas de barato o caro. Fair convierte la desviación del precio anunciado respecto a esa cifra en una puntuación provisional; no mide confianza ni precisión. Claude conecta herramientas y explica sus resultados. Las fichas de alquiler comparan mensualidades en €/mes: la renta estimada resulta del precio de venta indexado a 2025 multiplicado por ratios distritales de 2024. No constituye una valoración de alquiler validada. La evaluación LightGBM de la presentación pertenece al estudio histórico.</p>
            <p><Strong>Persistencia y tareas diarias.</Strong> Supabase (PostgreSQL) guarda cachés, favoritos, historial y suscripciones. Vercel programa la actualización de referencias de mercado. Supabase programa las llamadas al backend que preparan hasta cinco recomendaciones diarias para las suscripciones activas. Zone utiliza una copia reproducible de los recuentos urbanos por distrito; abrir la página no actualiza sus fuentes.</p>
          </div>

          <div className="mt-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-stone">Stack</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {STACK.map((s) => (
                <li
                  key={s}
                  className="rounded-md border border-hairline bg-paper-50 px-3 py-1.5 font-mono text-[11px] text-ink-700"
                >
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </Section>

        {/* CTA */}
        <div className="mt-16 flex flex-wrap items-center gap-3 border-t border-hairline pt-8">
          <Link
            href="/dashboard"
            className="group inline-flex items-center gap-2 rounded-lg bg-ink px-6 py-3.5 text-paper transition hover:bg-ink-700 active:scale-[0.98]"
          >
            Probar el panel
            <ArrowRight size={16} weight="bold" className="text-saffron-300 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/chat"
            className="inline-flex items-center gap-2 rounded-lg border border-hairline-strong px-6 py-3.5 text-ink-700 transition hover:border-ink/40 hover:text-ink"
          >
            Hablar con la IA
          </Link>
        </div>

        <p className="mt-10 text-xs leading-relaxed text-mist">
          Zone combina los cuatro indicadores disponibles. Las explicaciones se generan con los datos disponibles;
          si se usa narración con IA, puede equivocarse. Confirma precio, condiciones
          y disponibilidad en el anuncio original.
        </p>
      </main>
    </div>
  );
}

function Section({
  id,
  eyebrow,
  title,
  children,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mt-16 scroll-mt-24">
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3 border-b border-hairline pb-3">
        <h2 className="font-display text-2xl text-ink sm:text-3xl">{title}</h2>
        <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.2em] text-stone">
          {eyebrow}
        </span>
      </div>
      {children}
    </section>
  );
}

function Strong({ children }: { children: React.ReactNode }) {
  return <strong className="font-medium text-ink">{children}</strong>;
}

function EstadoPill({ estado }: { estado: Estado }) {
  const map = {
    oficial: { label: "oficial", cls: "border-sage-500/30 bg-sage-50 text-sage-500" },
    "no disponible": { label: "no disponible", cls: "border-amber-300 bg-amber-50 text-amber-900" },
    proveedor: { label: "proveedor", cls: "border-hairline-strong bg-paper-200 text-stone" },
  }[estado];
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-md border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] ${map.cls}`}
    >
      {map.label}
    </span>
  );
}
