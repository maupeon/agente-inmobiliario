import Link from "next/link";
import {
  ArrowRight,
  Buildings,
  ChartLineDown,
  ChatCircleText,
  CheckCircle,
  Clock,
  Heart,
  MapPin,
  MapTrifold,
  ShieldCheck,
  Sparkle,
} from "@phosphor-icons/react/dist/ssr";
import { HeroSearch } from "./HeroSearch";
import { SiteNav } from "./SiteNav";
import { Logo } from "./ui/Logo";

const BENEFITS = [
  {
    Icon: ChartLineDown,
    title: "Sabrás si el precio encaja",
    copy: "Comparamos el anuncio con la referencia disponible de la zona y te explicamos la diferencia sin jerga.",
    detail: "Precio frente a la zona",
  },
  {
    Icon: MapTrifold,
    title: "Entenderás el día a día",
    copy: "Consulta el barrio, los servicios y el trayecto al trabajo antes de abrir veinte pestañas.",
    detail: "Barrio y trayectos",
  },
  {
    Icon: Sparkle,
    title: "Verás primero lo que importa",
    copy: "HabitIA ordena las opciones según tu presupuesto, prioridades e imprescindibles.",
    detail: "Recomendaciones personales",
  },
];

const STEPS = [
  {
    number: "1",
    title: "Elige alquilar o comprar",
    copy: "Escribe una zona. Puedes empezar sin cuenta y sin completar un perfil.",
  },
  {
    number: "2",
    title: "Compara sobre el mapa",
    copy: "Revisa precio, metros, barrio y trayecto en una sola vista.",
  },
  {
    number: "3",
    title: "Guarda y pregunta",
    copy: "Conserva tus favoritas y usa el asistente para profundizar cuando lo necesites.",
  },
];

export function Landing() {
  return (
    <div className="relative z-10 overflow-hidden">
      <SiteNav />

      <main>
        <section className="mx-auto grid w-full max-w-[1200px] gap-12 px-5 pb-20 pt-12 sm:px-8 sm:pb-24 sm:pt-16 lg:grid-cols-[1.08fr,0.92fr] lg:items-center lg:gap-16 lg:pt-16">
          <div className="animate-fade-up">
            <div className="inline-flex items-center gap-2 rounded-full border border-saffron-200 bg-saffron-50 px-3 py-1.5 text-sm font-medium text-saffron-700">
              <Sparkle aria-hidden size={14} weight="fill" />
              Tu búsqueda de vivienda, más clara
            </div>

            <h1 className="mt-6 max-w-[11ch] text-balance font-display text-[clamp(3.2rem,6.4vw,5.6rem)] font-semibold leading-[0.94] tracking-[-0.065em] text-ink">
              Encuentra tu próximo hogar.
            </h1>
            <p className="mt-6 max-w-[58ch] text-pretty text-lg leading-relaxed text-stone-600 sm:text-xl">
              HabitIA te ayuda a alquilar o comprar con menos ruido: busca,
              compara el precio y te cuenta cómo encaja cada vivienda en tu vida.
            </p>

            <HeroSearch />

            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-stone-600">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle aria-hidden size={16} weight="fill" className="text-saffron-700" />
                Sin registro para empezar
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck aria-hidden size={16} weight="fill" className="text-saffron-700" />
                Fuentes explicadas
              </span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[520px] animate-fade-up [animation-delay:100ms] lg:mx-0">
            <div className="habitia-map relative aspect-[4/4.45] overflow-hidden rounded-[2rem] border border-white/80 shadow-lift">
              <div className="absolute inset-x-5 top-5 flex items-center justify-between rounded-2xl bg-white/82 px-4 py-3 shadow-lift backdrop-blur-xl sm:inset-x-7 sm:top-7">
                <div>
                  <p className="text-xs font-medium text-stone">5 opciones analizadas</p>
                  <p className="mt-0.5 font-semibold text-ink">Chamberí · alquiler</p>
                </div>
                <span className="grid h-10 w-10 place-items-center rounded-full bg-saffron-50 text-saffron-700">
                  <MapPin aria-hidden size={19} weight="fill" />
                </span>
              </div>

              <div aria-hidden className="absolute left-[28%] top-[37%] grid h-11 w-11 place-items-center rounded-full border-[5px] border-white bg-saffron-700 text-xs font-semibold text-white shadow-lift">
                1
              </div>
              <div aria-hidden className="absolute right-[18%] top-[44%] grid h-9 w-9 place-items-center rounded-full border-4 border-white bg-ink text-xs font-semibold text-white shadow-lift">
                2
              </div>
              <div aria-hidden className="absolute left-[47%] top-[58%] h-7 w-7 rounded-full border-4 border-white bg-saffron-300 shadow-lift" />

              <div className="absolute inset-x-4 bottom-4 rounded-[1.4rem] bg-white p-4 shadow-lift sm:inset-x-6 sm:bottom-6 sm:p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold text-saffron-700">Mejor coincidencia</p>
                    <p className="mt-1 font-semibold leading-tight text-ink">Piso luminoso en Trafalgar</p>
                  </div>
                  <Heart aria-hidden size={20} className="shrink-0 text-stone-400" />
                </div>
                <div className="mt-4 flex items-end justify-between gap-3 border-t border-hairline pt-4">
                  <div>
                    <p className="text-xl font-semibold tracking-tight text-ink">1.450 €<span className="text-sm font-normal text-stone">/mes</span></p>
                    <p className="mt-0.5 text-sm text-stone">2 hab. · 74 m²</p>
                  </div>
                  <div className="space-y-1 text-right text-xs font-medium text-stone-600">
                    <p className="text-saffron-700">4% bajo la zona</p>
                    <p className="inline-flex items-center gap-1"><Clock aria-hidden size={12} /> 18 min al trabajo</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-surface absolute -right-2 top-[29%] hidden rounded-2xl px-4 py-3 text-sm sm:block lg:-right-8">
              <p className="font-semibold text-ink">Barrio 82/100</p>
              <p className="text-xs text-stone">Buen transporte · tranquilo</p>
            </div>
          </div>
        </section>

        <section aria-label="Ventajas" className="border-y border-hairline bg-white/55">
          <div className="mx-auto grid w-full max-w-[1200px] gap-px px-5 sm:grid-cols-3 sm:px-8">
            {[
              [Buildings, "Alquiler y compra", "Una búsqueda para cada momento"],
              [MapPin, "Todo en contexto", "Mapa, precio, barrio y trayecto"],
              [ChatCircleText, "Una IA a tu lado", "Pregunta lo que no sale en la ficha"],
            ].map(([Icon, title, copy]) => {
              const ItemIcon = Icon as typeof Buildings;
              return (
                <div key={String(title)} className="flex items-start gap-3 border-b border-hairline py-6 last:border-b-0 sm:border-b-0 sm:border-r sm:px-7 sm:first:pl-0 sm:last:border-r-0 sm:last:pr-0">
                  <ItemIcon aria-hidden size={20} weight="duotone" className="mt-0.5 shrink-0 text-saffron-700" />
                  <div>
                    <p className="font-semibold text-ink">{String(title)}</p>
                    <p className="mt-0.5 text-sm text-stone-600">{String(copy)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1200px] px-5 py-24 sm:px-8 sm:py-32">
          <div className="max-w-[680px]">
            <p className="text-sm font-semibold text-saffron-700">Decide con contexto</p>
            <h2 className="mt-3 text-balance font-display text-4xl font-semibold leading-[1.02] tracking-[-0.045em] text-ink sm:text-5xl">
              Menos pestañas. Mejores preguntas.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-stone-600">
              Cada señal responde a una duda real antes de visitar una vivienda.
            </p>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {BENEFITS.map(({ Icon, title, copy, detail }) => (
              <article key={title} className="group rounded-2xl border border-hairline bg-paper-50 p-6 shadow-hairline transition hover:-translate-y-0.5 hover:shadow-lift sm:p-7">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-saffron-50 text-saffron-700">
                  <Icon aria-hidden size={23} weight="duotone" />
                </span>
                <p className="mt-8 text-xs font-semibold uppercase tracking-[0.08em] text-stone">{detail}</p>
                <h3 className="mt-2 text-xl font-semibold leading-tight tracking-[-0.025em] text-ink">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-stone-600">{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="como-funciona" className="scroll-mt-24 bg-ink text-paper">
          <div className="mx-auto grid w-full max-w-[1200px] gap-12 px-5 py-24 sm:px-8 sm:py-28 lg:grid-cols-[0.78fr,1.22fr] lg:gap-20">
            <div>
              <p className="text-sm font-semibold text-saffron-300">Cómo funciona</p>
              <h2 className="mt-3 text-balance font-display text-4xl font-semibold leading-[1.04] tracking-[-0.045em] sm:text-5xl">
                De la zona a una lista corta.
              </h2>
              <p className="mt-5 max-w-[44ch] text-paper/65">
                Empieza con lo imprescindible. Añade preferencias solo si quieres afinar el orden.
              </p>
              <Link href="/como-funciona" className="pressable mt-7 inline-flex min-h-11 items-center gap-2 rounded-xl bg-paper px-4 font-medium text-ink hover:bg-paper-200">
                Ver el método
                <ArrowRight aria-hidden size={15} weight="bold" className="text-saffron-700" />
              </Link>
            </div>

            <ol className="divide-y divide-white/10 border-y border-white/10">
              {STEPS.map((step) => (
                <li key={step.number} className="grid grid-cols-[auto,1fr] gap-5 py-6 sm:gap-8 sm:py-7">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-sm font-semibold text-saffron-300">
                    {step.number}
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold text-paper">{step.title}</h3>
                    <p className="mt-1.5 max-w-[52ch] text-sm leading-relaxed text-paper/60">{step.copy}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto grid w-full max-w-[1200px] gap-6 px-5 py-24 sm:px-8 sm:py-28 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-hairline bg-saffron-50 p-7 sm:p-10">
            <p className="text-sm font-semibold text-saffron-700">Antes de decidir</p>
            <h2 className="mt-3 max-w-[14ch] text-balance text-3xl font-semibold leading-tight tracking-[-0.04em] text-ink sm:text-4xl">
              ¿Te conviene comprar o alquilar?
            </h2>
            <p className="mt-4 max-w-[50ch] leading-relaxed text-stone-600">
              Compara ambos escenarios con entrada, hipoteca, alquiler e inversión a lo largo del tiempo.
            </p>
            <Link href="/comprar-o-alquilar" className="pressable mt-7 inline-flex min-h-12 items-center gap-2 rounded-xl bg-ink px-5 font-medium text-paper hover:bg-ink-700">
              Comparar escenarios
              <ArrowRight aria-hidden size={16} weight="bold" className="text-saffron-300" />
            </Link>
          </div>

          <div className="rounded-[2rem] border border-hairline bg-paper-50 p-7 sm:p-10">
            <p className="text-sm font-semibold text-saffron-700">Transparencia</p>
            <h2 className="mt-3 max-w-[16ch] text-balance text-3xl font-semibold leading-tight tracking-[-0.04em] text-ink sm:text-4xl">
              Cada dato tiene una fuente y un límite.
            </h2>
            <p className="mt-4 max-w-[50ch] leading-relaxed text-stone-600">
              Indicamos qué viene del anuncio, qué es una referencia pública y qué es una estimación. La disponibilidad se confirma siempre en la fuente original.
            </p>
            <Link href="/datos" className="pressable mt-7 inline-flex min-h-12 items-center gap-2 rounded-xl border border-hairline-strong bg-white px-5 font-medium text-ink hover:border-saffron-300">
              Ver datos y fuentes
              <ArrowRight aria-hidden size={16} weight="bold" className="text-saffron-700" />
            </Link>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1200px] px-5 pb-24 sm:px-8 sm:pb-28">
          <div className="relative overflow-hidden rounded-[2rem] bg-saffron-700 px-6 py-16 text-center text-white sm:px-12 sm:py-20">
            <div aria-hidden className="absolute -left-20 -top-28 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
            <div aria-hidden className="absolute -bottom-36 -right-16 h-80 w-80 rounded-full bg-ink/20 blur-2xl" />
            <div className="relative">
              <h2 className="mx-auto max-w-[17ch] text-balance text-4xl font-semibold leading-tight tracking-[-0.045em] sm:text-5xl">
                Tu próxima vivienda empieza por una zona.
              </h2>
              <p className="mx-auto mt-4 max-w-[48ch] text-white/75">
                Busca ahora y personaliza las recomendaciones cuando quieras.
              </p>
              <Link href="/dashboard" className="pressable mt-8 inline-flex min-h-12 items-center gap-2 rounded-xl bg-white px-6 py-3.5 font-semibold text-saffron-700 shadow-lift hover:bg-paper-100">
                Empezar a buscar
                <ArrowRight aria-hidden size={16} weight="bold" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-hairline bg-paper-50/70">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div>
            <Logo variant="inline" className="text-lg" />
            <p className="mt-1 text-sm text-stone">Menos ruido. Mejores decisiones de vivienda.</p>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-stone-600">
            <Link href="/como-funciona" className="hover:text-ink">Cómo funciona</Link>
            <Link href="/datos" className="hover:text-ink">Datos y fuentes</Link>
            <Link href="/chat" className="hover:text-ink">Asistente</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
