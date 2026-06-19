"use client";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { CommuteMode, Priority, UserProfile } from "@/types";
import { Logo } from "./ui/Logo";

const PRIORITIES: Array<{ key: Priority; label: string }> = [
  { key: "seguridad", label: "Seguridad" },
  { key: "cerca_trabajo", label: "Cerca del trabajo" },
  { key: "transporte", label: "Buen transporte" },
  { key: "zonas_verdes", label: "Zonas verdes" },
  { key: "vida_nocturna", label: "Vida nocturna" },
  { key: "tranquilidad", label: "Tranquilidad" },
];

const MODES: Array<{ key: CommuteMode; label: string }> = [
  { key: "a_pie", label: "A pie" },
  { key: "bici", label: "En bici" },
  { key: "transporte", label: "Transporte" },
  { key: "coche", label: "En coche" },
];

const STEPS = ["Tú", "Presupuesto", "Trabajo", "Prioridades"] as const;

export function Onboarding({
  initial,
  onComplete,
  onSkip,
}: {
  initial?: UserProfile | null;
  onComplete: (p: UserProfile) => void;
  onSkip: () => void;
}) {
  const [step, setStep] = useState(0);
  const [geocoding, setGeocoding] = useState(false);

  const [name, setName] = useState(initial?.name ?? "");
  const [operacion, setOperacion] = useState<UserProfile["operacion"]>(
    initial?.operacion ?? "alquiler"
  );
  const [zona, setZona] = useState(initial?.zona ?? "");
  const [presupuesto, setPresupuesto] = useState(
    initial?.presupuestoMax ? String(initial.presupuestoMax) : ""
  );
  const [habitaciones, setHabitaciones] = useState(
    initial?.habitaciones ? String(initial.habitaciones) : ""
  );
  const [trabajo, setTrabajo] = useState(initial?.trabajo?.direccion ?? "");
  const [modo, setModo] = useState<CommuteMode | undefined>(initial?.trabajo?.modo);
  const [prioridades, setPrioridades] = useState<Priority[]>(
    initial?.prioridades ?? []
  );

  const unidad = operacion === "venta" ? "€" : "€/mes";
  const isLast = step === STEPS.length - 1;

  async function finish() {
    setGeocoding(true);
    let trabajoObj: UserProfile["trabajo"] | undefined;
    const dir = trabajo.trim();
    if (dir) {
      trabajoObj = { direccion: dir, modo };
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(dir)}`);
        if (res.ok) {
          const { result } = (await res.json()) as {
            result: { lat: number; lon: number } | null;
          };
          if (result) {
            trabajoObj.lat = result.lat;
            trabajoObj.lon = result.lon;
          }
        }
      } catch {
        // Sin coordenadas: el cálculo de trayecto las resolverá más tarde.
      }
    }

    const profile: UserProfile = {
      name: name.trim() || undefined,
      operacion,
      zona: zona.trim() || undefined,
      presupuestoMax: presupuesto ? Number(presupuesto) : undefined,
      habitaciones: habitaciones ? Number(habitaciones) : undefined,
      trabajo: trabajoObj,
      prioridades: prioridades.length ? prioridades : undefined,
      createdAt: new Date().toISOString(),
    };
    onComplete(profile);
  }

  function togglePriority(p: Priority) {
    setPrioridades((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  }

  const greeting = useMemo(() => {
    const n = name.trim();
    return n ? `Encantado, ${n}.` : "Vamos a conocerte.";
  }, [name]);

  return (
    <div className="mx-auto max-w-[680px] animate-fade-up">
      {/* Masthead */}
      <div className="flex items-center justify-between gap-4 border-y border-ink py-2.5 font-mono text-[10px] uppercase tracking-[0.22em] text-ink">
        <span>
          Paso {String(step + 1).padStart(2, "0")} · {STEPS[step]}
        </span>
        <button
          type="button"
          onClick={onSkip}
          className="text-stone transition hover:text-ink"
        >
          Saltar →
        </button>
      </div>

      <div className="mt-10">
        <Logo variant="inline" className="text-2xl" />

        <div className="mt-8 min-h-[280px]">
          {step === 0 && (
            <Step
              eyebrow="Para empezar"
              title="¿Cómo te llamas y qué buscas?"
            >
              <Field label="Tu nombre (opcional)">
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Mauricio"
                  className={inputCls}
                />
              </Field>

              <Field label="¿Alquilar o comprar?">
                <div className="flex gap-2">
                  <Segment
                    active={operacion === "alquiler"}
                    onClick={() => setOperacion("alquiler")}
                  >
                    Alquilar
                  </Segment>
                  <Segment
                    active={operacion === "venta"}
                    onClick={() => setOperacion("venta")}
                  >
                    Comprar
                  </Segment>
                </div>
              </Field>

              <Field label="¿En qué zona o ciudad?">
                <input
                  value={zona}
                  onChange={(e) => setZona(e.target.value)}
                  placeholder="Malasaña, Madrid"
                  className={inputCls}
                />
              </Field>
            </Step>
          )}

          {step === 1 && (
            <Step eyebrow={greeting} title="¿Cuánto quieres gastar?">
              <Field label={`Presupuesto máximo (${unidad})`}>
                <div className="relative">
                  <input
                    autoFocus
                    inputMode="numeric"
                    value={presupuesto}
                    onChange={(e) =>
                      setPresupuesto(e.target.value.replace(/[^\d]/g, ""))
                    }
                    placeholder={operacion === "venta" ? "320000" : "1200"}
                    className={cn(inputCls, "pr-16")}
                  />
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-mono text-xs text-stone">
                    {unidad}
                  </span>
                </div>
              </Field>

              <Field label="Habitaciones mínimas (opcional)">
                <div className="flex gap-2">
                  {["1", "2", "3", "4"].map((n) => (
                    <Segment
                      key={n}
                      active={habitaciones === n}
                      onClick={() =>
                        setHabitaciones(habitaciones === n ? "" : n)
                      }
                    >
                      {n}
                      {n === "4" ? "+" : ""}
                    </Segment>
                  ))}
                </div>
              </Field>
            </Step>
          )}

          {step === 2 && (
            <Step
              eyebrow="Tu día a día"
              title="¿Dónde trabajas?"
              subtitle="Lo uso para calcular tu trayecto diario hasta cada piso."
            >
              <Field label="Dirección o zona del trabajo (opcional)">
                <input
                  autoFocus
                  value={trabajo}
                  onChange={(e) => setTrabajo(e.target.value)}
                  placeholder="Calle Gran Vía 28, Madrid"
                  className={inputCls}
                />
              </Field>

              <Field label="¿Cómo te mueves normalmente?">
                <div className="flex flex-wrap gap-2">
                  {MODES.map((m) => (
                    <Segment
                      key={m.key}
                      active={modo === m.key}
                      onClick={() => setModo(modo === m.key ? undefined : m.key)}
                    >
                      {m.label}
                    </Segment>
                  ))}
                </div>
              </Field>
            </Step>
          )}

          {step === 3 && (
            <Step
              eyebrow="Casi está"
              title="¿Qué es lo que más te importa?"
              subtitle="Elige las que quieras. Priorizaré los pisos y los análisis según esto."
            >
              <div className="flex flex-wrap gap-2.5">
                {PRIORITIES.map((p) => {
                  const on = prioridades.includes(p.key);
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => togglePriority(p.key)}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition active:scale-[0.98]",
                        on
                          ? "border-ink bg-ink text-paper"
                          : "border-hairline bg-paper-50 text-ink-700 hover:border-ink/30"
                      )}
                    >
                      {on && <Check size={13} weight="bold" className="text-saffron-300" />}
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </Step>
          )}
        </div>

        {/* Footer: dots + nav */}
        <div className="mt-10 flex items-center justify-between border-t border-hairline pt-6">
          <div className="flex items-center gap-2">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === step ? "w-6 bg-saffron-500" : "w-1.5 bg-hairline-strong"
                )}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="inline-flex items-center gap-1.5 rounded-md border border-hairline px-4 py-2.5 text-sm text-ink-700 transition hover:border-ink/30"
              >
                <ArrowLeft size={14} weight="bold" />
                Atrás
              </button>
            )}
            {isLast ? (
              <button
                type="button"
                onClick={finish}
                disabled={geocoding}
                className="inline-flex items-center gap-2 rounded-md bg-ink px-5 py-2.5 text-sm text-paper transition hover:bg-ink-700 active:scale-[0.98] disabled:opacity-60"
              >
                {geocoding ? "Preparando…" : "Empezar"}
                {!geocoding && <ArrowRight size={14} weight="bold" className="text-saffron-300" />}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                className="inline-flex items-center gap-2 rounded-md bg-ink px-5 py-2.5 text-sm text-paper transition hover:bg-ink-700 active:scale-[0.98]"
              >
                Siguiente
                <ArrowRight size={14} weight="bold" className="text-saffron-300" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-hairline bg-paper-50 px-4 py-3 text-ink placeholder:text-mist transition focus:border-ink/40 focus:outline-none";

function Step({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="animate-fade-up space-y-6">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-saffron-700">
          {eyebrow}
        </p>
        <h2 className="mt-2 font-display text-3xl leading-tight text-ink sm:text-4xl">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-2 max-w-[46ch] text-sm text-stone-600">{subtitle}</p>
        )}
      </div>
      <div className="space-y-5">{children}</div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.16em] text-stone">
        {label}
      </span>
      {children}
    </label>
  );
}

function Segment({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg border px-4 py-2.5 text-sm transition active:scale-[0.98]",
        active
          ? "border-ink bg-ink text-paper"
          : "border-hairline bg-paper-50 text-ink-700 hover:border-ink/30"
      )}
    >
      {children}
    </button>
  );
}
