"use client";
import { ArrowRight, PencilSimple } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { UserProfile } from "@/types";
import { Logo } from "./Logo";

type Suggestion = { label: string; prompt: string; tone?: "primary" | "muted" };

const PRIORITY_LABEL: Record<string, string> = {
  seguridad: "la seguridad",
  cerca_trabajo: "estar cerca del trabajo",
  vida_nocturna: "la vida nocturna",
  zonas_verdes: "las zonas verdes",
  transporte: "el transporte",
  tranquilidad: "la tranquilidad",
};

/** Construye un primer mensaje natural a partir del perfil del onboarding. */
function profileToPrompt(p: UserProfile): string {
  const op = p.operacion === "venta" ? "comprar" : "alquilar";
  const rooms = p.habitaciones ? `un piso de ${p.habitaciones} hab.` : "un piso";
  const zona = p.zona ? ` en ${p.zona}` : "";
  let budget = "";
  if (p.presupuestoMax) {
    const n = p.presupuestoMax.toLocaleString("es-ES");
    budget = p.operacion === "venta" ? ` por un máximo de ${n} €` : ` por un máximo de ${n} € al mes`;
  }
  let s = `Quiero ${op} ${rooms}${zona}${budget}.`;
  if (p.operacion !== "venta") {
    s += " Enséñame opciones y dime si están bien de precio y qué tal se vive en la zona.";
  } else {
    s += " Enséñame opciones que encajen.";
  }
  return s;
}

const SUGGESTIONS: Array<{ label: string; prompt: string; tone?: "primary" | "muted" }> = [
  {
    label: "Piso de 2 hab. en Malasaña por 350 mil",
    prompt: "Busco un piso de 2 habitaciones en Malasaña, Madrid, por un máximo de 350.000 €.",
    tone: "primary",
  },
  {
    label: "Alquiler en Eixample, hasta 1.400 € al mes",
    prompt: "Quiero alquilar un piso en el Eixample de Barcelona, máximo 1.400 € al mes.",
  },
  {
    label: "Casa con jardín cerca de Sevilla",
    prompt: "Estoy buscando una casa con jardín en los alrededores de Sevilla, presupuesto 280.000 €.",
  },
  {
    label: "Cuota de un piso de 320.000 € a 30 años",
    prompt: "¿Cuánto sería la cuota mensual de un piso de 320.000 € con un 20% de entrada y 30 años?",
  },
];

const STEPS = [
  { i: "01", t: "Cuenta lo que buscas", d: "Zona, presupuesto y si es compra o alquiler. Sin jerga." },
  { i: "02", t: "HabitIA compara", d: "Te enseña opciones con foto, precio, contexto y enlace al anuncio." },
  { i: "03", t: "Pide detalles o números", d: "Más fotos de un piso concreto o el cálculo exacto de la hipoteca." },
];

export function EmptyState({
  onPick,
  profile,
  onEditProfile,
}: {
  onPick: (prompt: string) => void;
  profile?: UserProfile | null;
  onEditProfile?: () => void;
}) {
  const fechaEdicion = new Date().toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
  });

  const suggestions: Suggestion[] = profile
    ? [
        { label: "Buscar lo que encaja con mi perfil", prompt: profileToPrompt(profile), tone: "primary" },
        ...SUGGESTIONS.filter((s) => s.tone !== "primary").slice(0, 3),
      ]
    : SUGGESTIONS;

  const saludo = profile?.name ? `Hola, ${profile.name}.` : "Hola.";
  const prioridad = profile?.prioridades?.length
    ? PRIORITY_LABEL[profile.prioridades[0]] ?? null
    : null;

  return (
    <div className="space-y-12">
      {/* ─── Masthead editorial ─── */}
      <div className="animate-fade-up">
        <div className="flex items-center justify-between gap-4 border-y border-ink py-2.5 font-mono text-[10px] uppercase tracking-[0.22em] text-ink">
          <span>Edición · {fechaEdicion}</span>
          {profile && onEditProfile ? (
            <button
              type="button"
              onClick={onEditProfile}
              className="inline-flex items-center gap-1.5 text-stone transition hover:text-ink"
            >
              <PencilSimple size={11} weight="bold" />
              Editar perfil
            </button>
          ) : (
            <span className="hidden sm:inline">IA conversacional · mercado español</span>
          )}
          <span className="tabular text-stone">№ 001</span>
        </div>

        <div className="mt-10 grid items-end gap-x-12 gap-y-8 lg:grid-cols-[1.5fr,1fr]">
          <div>
            <Logo
              variant="stack"
              className="text-[clamp(3rem,8vw,6.5rem)]"
            />
            <p className="mt-6 max-w-[42ch] text-pretty text-lg text-stone-600">
              {profile ? (
                <>
                  {saludo} Busco {profile.operacion === "venta" ? "compra" : "alquiler"}
                  {profile.zona ? ` en ${profile.zona}` : ""}
                  {prioridad ? `, cuidando ${prioridad}` : ""}. Yo comparo precios,
                  miro el barrio y te calculo el trayecto a tu trabajo.
                </>
              ) : (
                <>
                  Habla en lenguaje natural. HabitIA busca, compara el contexto
                  y te ayuda con los números cuando lo necesites.
                </>
              )}
            </p>
          </div>

          <p className="border-l border-hairline pl-6 font-display text-xl italic leading-snug text-ink-700 sm:text-2xl">
            “El piso lo veo yo, los datos los pongo yo. Tú dime cómo quieres
            vivir.”
          </p>
        </div>
      </div>

      {/* ─── Cómo funciona + Probar con (split asimétrico) ─── */}
      <div className="grid gap-10 lg:grid-cols-[1.2fr,1fr] lg:items-start">
        <div className="animate-fade-up [animation-delay:80ms]">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-stone">
            Cómo funciona
          </p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-3">
            {STEPS.map((s, idx) => (
              <li
                key={s.i}
                className="rounded-lg border border-hairline bg-paper-50 p-5"
                style={{ animationDelay: `${idx * 80}ms` }}
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-stone tabular">
                  {s.i}
                </p>
                <p className="mt-2 font-display text-lg leading-tight text-ink">
                  {s.t}
                </p>
                <p className="mt-1 text-sm text-stone-600">{s.d}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="grainy-blob relative space-y-4 rounded-xl border border-hairline bg-paper-50 p-6 animate-fade-up [animation-delay:160ms] sm:p-7">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-stone">
            Probar con
          </p>
          <ul className="space-y-2">
            {suggestions.map((s, idx) => (
              <li key={s.label}>
                <button
                  type="button"
                  onClick={() => onPick(s.prompt)}
                  className={cn(
                    "pressable group flex min-h-12 w-full items-center justify-between gap-4 rounded-xl border px-4 py-3.5 text-left",
                    s.tone === "primary"
                      ? "border-ink bg-ink text-paper hover:bg-ink-700"
                      : "border-hairline bg-paper text-ink-700 hover:border-ink/30 hover:text-ink"
                  )}
                  style={{ animationDelay: `${idx * 80}ms` }}
                >
                  <span className="text-balance">{s.label}</span>
                  <ArrowRight
                    size={15}
                    weight="bold"
                    className={cn(
                      "shrink-0 transition-transform group-hover:translate-x-0.5",
                      s.tone === "primary" ? "text-paper" : "text-saffron-700"
                    )}
                  />
                </button>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2 border-t border-hairline pt-4 text-[11px] text-stone">
            <span className="kbd">↵</span>
            <span>envía</span>
            <span className="mx-1 text-mist">·</span>
            <span className="kbd">⇧</span>
            <span>+</span>
            <span className="kbd">↵</span>
            <span>nueva línea</span>
          </div>
        </div>
      </div>
    </div>
  );
}
