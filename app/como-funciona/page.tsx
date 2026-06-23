import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { SiteNav } from "@/components/SiteNav";
import { Logo } from "@/components/ui/Logo";

export const metadata: Metadata = {
  title: "Cómo funciona — Agente Inmobiliario",
  description:
    "Cómo funciona el Agente Inmobiliario: del onboarding a las recomendaciones en el mapa, su arquitectura y de dónde salen los datos.",
};

const STEPS = [
  {
    n: "01",
    t: "Onboarding en el mapa",
    d: "Nos cuentas quién eres: eliges la zona y tu trabajo sobre un mapa, tu presupuesto, con quién vives y qué te importa de un barrio. Sin formularios interminables.",
  },
  {
    n: "02",
    t: "Recomendación “para ti”",
    d: "Buscamos en Idealista con tu perfil y puntuamos cada piso según tus prioridades, el presupuesto, el precio frente a la zona, el trayecto y la seguridad.",
  },
  {
    n: "03",
    t: "Enriquecimiento",
    d: "A cada candidato le calculamos tres señales: si está caro o barato para la zona, cómo de seguro es el barrio y cuánto tardas a tu trabajo (con la ruta real).",
  },
  {
    n: "04",
    t: "Mapa + explicación",
    d: "Te enseñamos los 3-5 mejores sobre el mapa, coloreados por precio, con el halo de seguridad y el trayecto dibujado — y una frase de por qué encaja contigo.",
  },
];

const SIGNALS = [
  {
    t: "Precio frente a la zona",
    d: "Comparamos el €/m² del anuncio con la referencia de la zona (alquiler) o de la provincia (compra) y te decimos cuánto se desvía.",
    fuente: "MITMA · SERPAVI",
  },
  {
    t: "Seguridad del barrio",
    d: "Un índice 0-100 de seguridad y calidad de vida (transporte, zonas verdes, servicios, ocio, tranquilidad).",
    fuente: "Min. Interior",
  },
  {
    t: "Trayecto al trabajo",
    d: "Tiempo y ruta real desde tu trabajo hasta cada piso, en tu medio de transporte habitual.",
    fuente: "OpenRouteService",
  },
];

type Estado = "real" | "orientativo" | "infra";
const SOURCES: Array<{ fuente: string; aporta: string; estado: Estado; refresco: string }> = [
  { fuente: "Idealista", aporta: "Anuncios: pisos, fotos, precio, m²", estado: "infra", refresco: "Al buscar (mock hasta tener clave propia)" },
  { fuente: "MITMA — Valor Tasado", aporta: "Precio €/m² de compra por provincia", estado: "real", refresco: "Trimestral (cron)" },
  { fuente: "INE — IPV (tabla 25171)", aporta: "Tendencia de precios de vivienda (%)", estado: "real", refresco: "Trimestral" },
  { fuente: "Banco de España", aporta: "Tipo hipotecario medio + Euríbor 12m", estado: "real", refresco: "Mensual" },
  { fuente: "OpenRouteService", aporta: "Rutas y tiempos de trayecto", estado: "real", refresco: "En vivo (con ORS_API_KEY)" },
  { fuente: "Nominatim (OpenStreetMap)", aporta: "Geocodificación del mapa", estado: "real", refresco: "En vivo" },
  { fuente: "SERPAVI — MIVAU", aporta: "Alquiler €/m²/mes por zona", estado: "orientativo", refresco: "Snapshot (el portal bloquea descargas automáticas)" },
  { fuente: "Min. del Interior", aporta: "Criminalidad y seguridad por barrio", estado: "orientativo", refresco: "Snapshot (datos curados)" },
  { fuente: "Supabase", aporta: "Conversaciones, favoritos y caché de mercado", estado: "infra", refresco: "Persistencia" },
];

const STACK = [
  "Next.js 14 (App Router, SSR + SSE)",
  "Claude — Opus (chat) + Sonnet (insights)",
  "MapLibre GL + teselas CARTO (sin clave)",
  "Supabase (Postgres) — caché y persistencia",
  "OpenRouteService — routing",
  "INE · MITMA · Banco de España — mercado",
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
            Del onboarding a tus 3-5 pisos, explicado.
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-stone-600">
            <Logo variant="mark" className="text-[1.1em]" /> es un agente
            inmobiliario que no te hace rellenar filtros: le cuentas cómo quieres
            vivir y te devuelve los pisos que mejor encajan, sobre un mapa, con el
            porqué de cada uno. Aquí tienes cómo está montado por dentro.
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
            Pedimos varios candidatos a Idealista y los puntuamos de 0 a 100
            combinando: <Strong>precio frente a la zona</Strong>,{" "}
            <Strong>ajuste a tu presupuesto</Strong>, <Strong>trayecto</Strong> al
            trabajo, <Strong>seguridad</Strong> del barrio,{" "}
            <Strong>calidad de vida</Strong> e <Strong>imprescindibles</Strong>{" "}
            (ascensor, exterior…). Tus prioridades del onboarding suben el peso de
            lo que más te importa: si marcaste “seguridad”, los barrios seguros
            pesan más; si marcaste “cerca del trabajo”, manda el trayecto. Nos
            quedamos con los 3-5 mejores y un modelo de lenguaje redacta el “por
            qué encaja” usando solo esos datos (sin inventar nada).
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
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
        </Section>

        {/* Datos */}
        <Section eyebrow="De dónde salen los datos" title="Fuentes, con transparencia">
          <p className="mb-5 max-w-[68ch] text-sm leading-relaxed text-stone-600">
            Marcamos en verde lo que viene de una fuente oficial en vivo y en
            ámbar lo orientativo (datos curados o snapshots, mientras integramos
            el dataset oficial). El agente siempre lo advierte en sus tarjetas.
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
                      {s.fuente}
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

        {/* Arquitectura */}
        <Section eyebrow="La arquitectura" title="Qué habla con qué">
          <div className="rounded-xl border border-hairline bg-paper-50 p-6 font-mono text-[11px] leading-relaxed text-ink-700 sm:p-8">
            <Box>Navegador · Next.js + React (panel, mapa MapLibre)</Box>
            <Arrow label="perfil + filtros" />
            <Box>
              <span className="text-ink">/api/recommend</span> → lib/recommend
              (buscar · puntuar · narrar)
            </Box>
            <div className="my-2 grid gap-2 sm:grid-cols-3">
              <SubBox>Idealista<br />(búsqueda)</SubBox>
              <SubBox>lib/enrich<br />precio · barrio · trayecto</SubBox>
              <SubBox>ai-insights<br />Claude (Sonnet)</SubBox>
            </div>
            <Arrow label="lee referencias de mercado" />
            <Box>
              Caché de mercado · <span className="text-ink">Supabase</span>{" "}
              (+ fallback en memoria / fixtures)
            </Box>
            <Arrow label="refresco trimestral" up />
            <Box>
              <span className="text-ink">/api/cron/market</span> → MITMA · INE · Banco de España
            </Box>
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
          Los indicadores de seguridad y las referencias de alquiler son
          orientativos (no oficiales en vivo a nivel de barrio). La IA puede
          equivocarse: verifica los anuncios en Idealista.
        </p>
      </main>
    </div>
  );
}

function Section({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-16">
      <div className="mb-6 flex items-baseline justify-between gap-4 border-b border-hairline pb-3">
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
    real: { label: "real", cls: "border-sage-500/30 bg-sage-50 text-sage-500" },
    orientativo: { label: "orientativo", cls: "border-saffron-300/40 bg-saffron-50 text-saffron-700" },
    infra: { label: "infra", cls: "border-hairline-strong bg-paper-200 text-stone" },
  }[estado];
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-md border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] ${map.cls}`}
    >
      {map.label}
    </span>
  );
}

function Box({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-hairline-strong bg-paper px-4 py-3 text-center">
      {children}
    </div>
  );
}

function SubBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-hairline-strong bg-paper px-3 py-2.5 text-center text-[10px] leading-tight text-stone">
      {children}
    </div>
  );
}

function Arrow({ label, up }: { label?: string; up?: boolean }) {
  return (
    <div className="flex items-center justify-center gap-2 py-1.5 text-mist">
      <span>{up ? "↑" : "↓"}</span>
      {label && <span className="text-[10px] uppercase tracking-[0.14em]">{label}</span>}
    </div>
  );
}
