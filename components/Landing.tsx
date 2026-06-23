import Link from "next/link";
import {
  ArrowRight,
  Calculator,
  ChartBar,
  Leaf,
  MagnifyingGlass,
  Path,
  Scales,
  ShieldCheck,
} from "@phosphor-icons/react/dist/ssr";
import { Logo } from "./ui/Logo";
import { SiteNav } from "./SiteNav";

const FEATURES = [
  {
    n: "01",
    Icon: MagnifyingGlass,
    t: "Búsqueda conversacional",
    d: "Dilo en una frase — «2 hab. en Malasaña por 1.200 €/mes» — y busco en Idealista por ti. Sin filtros ni formularios.",
  },
  {
    n: "02",
    Icon: Scales,
    t: "¿Caro o barato?",
    d: "Comparo el €/m²/mes del anuncio con la referencia de la zona y te digo, sin rodeos, si la renta está bien de precio.",
  },
  {
    n: "03",
    Icon: Path,
    t: "Trayecto al trabajo",
    d: "Cuánto tardas de tu oficina a cada piso: a pie, en bici, en coche o en transporte público.",
  },
  {
    n: "04",
    Icon: ShieldCheck,
    t: "Seguridad del barrio",
    d: "Un índice de seguridad y el contexto de criminalidad de la zona, para que decidas con datos y no con rumores.",
  },
  {
    n: "05",
    Icon: Leaf,
    t: "Calidad de vida",
    d: "Transporte, zonas verdes, servicios, vida nocturna y tranquilidad, resumidos de un vistazo.",
  },
  {
    n: "06",
    Icon: Calculator,
    t: "Hipoteca y esfuerzo",
    d: "Cuota mensual, coste total y qué porcentaje de tu sueldo se llevaría. Para compra, cuando toque dar el salto.",
  },
];

const STEPS = [
  {
    i: "01",
    t: "Cuéntanos quién eres",
    d: "Un onboarding de medio minuto: zona, presupuesto, dónde trabajas y qué te importa de un barrio.",
  },
  {
    i: "02",
    t: "Recibe tus 3-5 pisos",
    d: "Sin formularios interminables: te enseño en el mapa los que mejor encajan contigo, ya analizados.",
  },
  {
    i: "03",
    t: "Decide con datos claros",
    d: "Precio frente a la zona, seguridad del barrio y trayecto al trabajo — y el chat ahí si quieres preguntar.",
  },
];

export function Landing() {
  const fecha = new Date().toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
  });

  return (
    <div className="relative z-10">
      <SiteNav />

      <main className="mx-auto w-full max-w-[1100px] px-5 sm:px-8">
        {/* ─── Hero ─── */}
        <section className="pt-14 sm:pt-20">
          <div className="flex items-center justify-between gap-4 border-y border-ink py-2.5 font-mono text-[10px] uppercase tracking-[0.22em] text-ink">
            <span>Edición · {fecha}</span>
            <span className="hidden sm:inline">IA conversacional · mercado español</span>
            <span className="tabular text-stone">№ 001</span>
          </div>

          <div className="mt-12 grid items-end gap-x-12 gap-y-10 lg:grid-cols-[1.45fr,1fr]">
            <div className="animate-fade-up">
              <Logo
                variant="stack"
                className="text-[clamp(3rem,8.5vw,7rem)]"
                highlightClassName="font-display italic font-light text-saffron-700"
              />
              <p className="mt-7 max-w-[46ch] text-pretty text-xl leading-relaxed text-stone-600">
                Cuéntame qué buscas y te enseño los pisos que mejor encajan
                contigo, sobre el mapa: si están bien de precio, cómo se vive en
                el barrio y cuánto tardas a tu trabajo.
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link
                  href="/dashboard"
                  className="group inline-flex items-center gap-2 rounded-lg bg-ink px-6 py-3.5 text-paper transition hover:bg-ink-700 active:scale-[0.98]"
                >
                  Buscar mi piso
                  <ArrowRight size={16} weight="bold" className="text-saffron-300 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <a
                  href="#como-funciona"
                  className="inline-flex items-center gap-2 rounded-lg border border-hairline-strong px-6 py-3.5 text-ink-700 transition hover:border-ink/40 hover:text-ink"
                >
                  Ver cómo funciona
                </a>
              </div>
            </div>

            <blockquote className="border-l border-hairline pl-6 font-display text-2xl italic leading-snug text-ink-700 animate-fade-up [animation-delay:120ms] sm:text-[1.7rem]">
              “El piso lo veo yo, los datos los pongo yo. Tú dime cómo quieres
              vivir.”
            </blockquote>
          </div>
        </section>

        {/* ─── Qué hace ─── */}
        <section className="mt-24 sm:mt-32">
          <div className="flex items-baseline justify-between gap-4 border-b border-hairline pb-4">
            <h2 className="font-display text-3xl text-ink sm:text-4xl">
              Un asesor inmobiliario en una conversación
            </h2>
            <span className="hidden shrink-0 font-mono text-[10px] uppercase tracking-[0.2em] text-stone sm:inline">
              Qué hace
            </span>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ n, Icon, t, d }) => (
              <article
                key={n}
                className="group rounded-xl border border-hairline bg-paper-50 p-6 transition hover:border-ink/20"
              >
                <div className="flex items-center justify-between">
                  <span className="grid h-9 w-9 place-items-center rounded-lg border border-hairline bg-paper text-ink transition group-hover:border-saffron-300">
                    <Icon size={17} weight="bold" className="text-saffron-700" />
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-mist tabular">
                    {n}
                  </span>
                </div>
                <h3 className="mt-5 font-display text-xl leading-tight text-ink">
                  {t}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">{d}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ─── Cómo funciona ─── */}
        <section id="como-funciona" className="mt-24 scroll-mt-24 sm:mt-32">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-stone">
            Cómo funciona
          </p>
          <div className="mt-5 grid gap-px overflow-hidden rounded-xl border border-hairline bg-hairline sm:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.i} className="bg-paper-50 p-7">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-saffron-700 tabular">
                  {s.i}
                </p>
                <h3 className="mt-3 font-display text-2xl leading-tight text-ink">
                  {s.t}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Marca + transparencia de datos ─── */}
        <section className="mt-24 grid gap-10 sm:mt-32 lg:grid-cols-2">
          <div className="grainy-blob relative rounded-xl border border-hairline bg-paper-50 p-8">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-stone">
              La marca
            </p>
            <div className="mt-5 flex items-center gap-5">
              <Logo variant="mark" className="text-5xl" />
              <p className="text-sm leading-relaxed text-stone-600">
                La <span className="font-display italic text-saffron-700">A</span> de
                Agente y la <span className="font-display italic text-saffron-700">I</span> de
                Inmobiliario forman el sigil <span className="font-display italic text-saffron-700">A·I</span> —
                IA. El nombre es también lo que es: inteligencia artificial al
                servicio de tu próxima casa.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-hairline bg-paper-50 p-8">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-stone">
              De dónde salen los datos
            </p>
            <ul className="mt-5 space-y-3 text-sm leading-relaxed text-stone-600">
              <li className="flex gap-3">
                <ChartBar size={16} weight="bold" className="mt-0.5 shrink-0 text-saffron-700" />
                <span>
                  Anuncios reales de <span className="text-ink">Idealista</span> y
                  datos de mercado del <span className="text-ink">INE</span> y el{" "}
                  <span className="text-ink">Banco de España</span>.
                </span>
              </li>
              <li className="flex gap-3">
                <ShieldCheck size={16} weight="bold" className="mt-0.5 shrink-0 text-saffron-700" />
                <span>
                  Los indicadores de seguridad y calidad de vida son{" "}
                  <span className="text-ink">estimaciones orientativas</span>,
                  compuestas a partir de fuentes públicas. Te avisamos siempre.
                </span>
              </li>
            </ul>
          </div>
        </section>

        {/* ─── CTA final ─── */}
        <section className="mt-24 sm:mt-32">
          <div className="grainy-blob relative overflow-hidden rounded-2xl border border-ink bg-ink px-8 py-14 text-center text-paper sm:py-20">
            <h2 className="mx-auto max-w-[20ch] font-display text-4xl leading-tight sm:text-5xl">
              Busca piso de otra forma.
            </h2>
            <p className="mx-auto mt-4 max-w-[44ch] text-pretty text-paper/70">
              Sin filtros interminables. Solo una conversación que entiende cómo
              quieres vivir.
            </p>
            <Link
              href="/dashboard"
              className="group mt-8 inline-flex items-center gap-2 rounded-lg bg-paper px-7 py-3.5 text-ink transition hover:bg-paper-200 active:scale-[0.98]"
            >
              Empezar ahora
              <ArrowRight size={16} weight="bold" className="text-saffron-700 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </section>

        {/* ─── Footer ─── */}
        <footer className="mt-20 flex flex-col items-center justify-between gap-4 border-t border-hairline py-10 sm:flex-row">
          <Logo variant="inline" className="text-[0.95rem]" />
          <p className="text-center font-mono text-[10px] uppercase tracking-[0.16em] text-mist sm:text-right">
            La IA puede equivocarse · verifica los anuncios en Idealista
          </p>
        </footer>
      </main>
    </div>
  );
}
