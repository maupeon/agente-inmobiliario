"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { ArrowLeft, ArrowRight, Check } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type {
  CommuteMode,
  Hogar,
  Imprescindible,
  Priority,
  UserProfile,
} from "@/types";
import type { PickedLocation } from "./LocationPicker";
import { Logo } from "./ui/Logo";

const LocationPicker = dynamic(() => import("./LocationPicker"), {
  ssr: false,
  loading: () => (
    <div className="grid h-[300px] place-items-center rounded-lg border border-hairline bg-paper-200 font-mono text-[10px] uppercase tracking-[0.2em] text-stone">
      Cargando mapa…
    </div>
  ),
});

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

const HOGARES: Array<{ key: Hogar; label: string }> = [
  { key: "solo", label: "Solo/a" },
  { key: "pareja", label: "En pareja" },
  { key: "familia", label: "Con familia" },
  { key: "compartido", label: "Compartido" },
];

const MUST: Array<{ key: Imprescindible; label: string }> = [
  { key: "ascensor", label: "Ascensor" },
  { key: "exterior", label: "Exterior / luminoso" },
  { key: "terraza", label: "Terraza o balcón" },
  { key: "aire_acondicionado", label: "Aire acondicionado" },
  { key: "amueblado", label: "Amueblado" },
  { key: "garaje", label: "Garaje" },
  { key: "trastero", label: "Trastero" },
];

const STEPS = ["Tú", "Zona", "Sobre ti", "Trabajo", "Prioridades"] as const;

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

  const [name, setName] = useState(initial?.name ?? "");
  const [operacion, setOperacion] = useState<UserProfile["operacion"]>(
    initial?.operacion ?? "alquiler"
  );
  const [tipo, setTipo] = useState<"pisos" | "casas">(initial?.tipo ?? "pisos");
  const [zonaLoc, setZonaLoc] = useState<PickedLocation | null>(
    initial?.zona && initial.zonaLat != null && initial.zonaLon != null
      ? { lat: initial.zonaLat, lon: initial.zonaLon, label: initial.zona }
      : null
  );
  const [presupuesto, setPresupuesto] = useState(
    initial?.presupuestoMax ? String(initial.presupuestoMax) : ""
  );
  const [habitaciones, setHabitaciones] = useState(
    initial?.habitaciones ? String(initial.habitaciones) : ""
  );
  const [hogar, setHogar] = useState<Hogar | undefined>(initial?.hogar);
  const [mascota, setMascota] = useState<boolean | undefined>(initial?.mascota);
  const [trabajoLoc, setTrabajoLoc] = useState<PickedLocation | null>(
    initial?.trabajo?.lat != null && initial?.trabajo?.lon != null
      ? {
          lat: initial.trabajo.lat,
          lon: initial.trabajo.lon,
          label: initial.trabajo.direccion,
        }
      : null
  );
  const [modo, setModo] = useState<CommuteMode | undefined>(initial?.trabajo?.modo);
  const [imprescindibles, setImprescindibles] = useState<Imprescindible[]>(
    initial?.imprescindibles ?? []
  );
  const [prioridades, setPrioridades] = useState<Priority[]>(initial?.prioridades ?? []);

  const unidad = operacion === "venta" ? "€" : "€/mes";
  const isLast = step === STEPS.length - 1;

  function finish() {
    const profile: UserProfile = {
      name: name.trim() || undefined,
      operacion,
      tipo,
      zona: zonaLoc?.label || undefined,
      zonaLat: zonaLoc?.lat,
      zonaLon: zonaLoc?.lon,
      presupuestoMax: presupuesto ? Number(presupuesto) : undefined,
      habitaciones: habitaciones ? Number(habitaciones) : undefined,
      hogar,
      mascota,
      imprescindibles: imprescindibles.length ? imprescindibles : undefined,
      trabajo: trabajoLoc
        ? {
            direccion: trabajoLoc.label,
            lat: trabajoLoc.lat,
            lon: trabajoLoc.lon,
            modo,
          }
        : undefined,
      prioridades: prioridades.length ? prioridades : undefined,
      createdAt: new Date().toISOString(),
    };
    onComplete(profile);
  }

  function toggle<T>(value: T, list: T[], set: (l: T[]) => void) {
    set(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  }

  const greeting = name.trim() ? `Encantado, ${name.trim()}.` : "Vamos a conocerte.";

  return (
    <div className="mx-auto max-w-[680px] animate-fade-up">
      <div className="flex items-center justify-between gap-4 border-y border-ink py-2.5 font-mono text-[10px] uppercase tracking-[0.22em] text-ink">
        <span>
          Paso {String(step + 1).padStart(2, "0")} · {STEPS[step]}
        </span>
        <button type="button" onClick={onSkip} className="text-stone transition hover:text-ink">
          Saltar →
        </button>
      </div>

      <div className="mt-10">
        <Logo variant="inline" className="text-2xl" />

        <div className="mt-8 min-h-[320px]">
          {step === 0 && (
            <Step eyebrow="Para empezar" title="¿Cómo te llamas y qué buscas?">
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
                  <Segment active={operacion === "alquiler"} onClick={() => setOperacion("alquiler")}>
                    Alquilar
                  </Segment>
                  <Segment active={operacion === "venta"} onClick={() => setOperacion("venta")}>
                    Comprar
                  </Segment>
                </div>
              </Field>

              <Field label="¿Qué tipo de vivienda?">
                <div className="flex gap-2">
                  <Segment active={tipo === "pisos"} onClick={() => setTipo("pisos")}>
                    Piso
                  </Segment>
                  <Segment active={tipo === "casas"} onClick={() => setTipo("casas")}>
                    Casa
                  </Segment>
                </div>
              </Field>
            </Step>
          )}

          {step === 1 && (
            <Step
              eyebrow={greeting}
              title="¿Dónde quieres vivir?"
              subtitle="Busca la zona o muévete por el mapa y suelta el pin donde te gustaría."
            >
              <LocationPicker
                value={zonaLoc}
                onChange={setZonaLoc}
                accent="#956400"
                searchPlaceholder="Barrio o ciudad: Malasaña, Madrid…"
              />
            </Step>
          )}

          {step === 2 && (
            <Step eyebrow="Sobre ti" title="Para afinar lo que te enseño">
              <Field label="¿Con quién vivirás?">
                <div className="flex flex-wrap gap-2">
                  {HOGARES.map((h) => (
                    <Segment
                      key={h.key}
                      active={hogar === h.key}
                      onClick={() => setHogar(hogar === h.key ? undefined : h.key)}
                    >
                      {h.label}
                    </Segment>
                  ))}
                </div>
              </Field>

              <Field label="Habitaciones mínimas (opcional)">
                <div className="flex gap-2">
                  {["1", "2", "3", "4"].map((n) => (
                    <Segment
                      key={n}
                      active={habitaciones === n}
                      onClick={() => setHabitaciones(habitaciones === n ? "" : n)}
                    >
                      {n}
                      {n === "4" ? "+" : ""}
                    </Segment>
                  ))}
                </div>
              </Field>

              <Field label={`Presupuesto máximo (${unidad})`}>
                <div className="relative">
                  <input
                    inputMode="numeric"
                    value={presupuesto}
                    onChange={(e) => setPresupuesto(e.target.value.replace(/[^\d]/g, ""))}
                    placeholder={operacion === "venta" ? "320000" : "1200"}
                    className={cn(inputCls, "pr-16")}
                  />
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-mono text-xs text-stone">
                    {unidad}
                  </span>
                </div>
              </Field>

              <Field label="¿Tienes mascota?">
                <div className="flex gap-2">
                  <Segment active={mascota === true} onClick={() => setMascota(mascota === true ? undefined : true)}>
                    Sí
                  </Segment>
                  <Segment active={mascota === false} onClick={() => setMascota(mascota === false ? undefined : false)}>
                    No
                  </Segment>
                </div>
              </Field>
            </Step>
          )}

          {step === 3 && (
            <Step
              eyebrow="Tu día a día"
              title="¿Dónde trabajas?"
              subtitle="Sitúalo en el mapa y calculo el trayecto diario hasta cada piso. Si no aplica, puedes saltar."
            >
              <LocationPicker
                value={trabajoLoc}
                onChange={setTrabajoLoc}
                accent="#1A1A1A"
                searchPlaceholder="Dirección o zona del trabajo…"
                defaultCenter={
                  zonaLoc ? { lat: zonaLoc.lat, lon: zonaLoc.lon, zoom: 12 } : undefined
                }
              />

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

          {step === 4 && (
            <Step
              eyebrow="Casi está"
              title="¿Qué es lo que más te importa?"
              subtitle="Elige lo que quieras. Priorizo los pisos y los análisis según esto."
            >
              <Field label="Prioridades del barrio">
                <div className="flex flex-wrap gap-2.5">
                  {PRIORITIES.map((p) => (
                    <Chip
                      key={p.key}
                      active={prioridades.includes(p.key)}
                      onClick={() => toggle(p.key, prioridades, setPrioridades)}
                    >
                      {p.label}
                    </Chip>
                  ))}
                </div>
              </Field>

              <Field label="Imprescindibles del piso">
                <div className="flex flex-wrap gap-2.5">
                  {MUST.map((m) => (
                    <Chip
                      key={m.key}
                      active={imprescindibles.includes(m.key)}
                      onClick={() => toggle(m.key, imprescindibles, setImprescindibles)}
                    >
                      {m.label}
                    </Chip>
                  ))}
                </div>
              </Field>
            </Step>
          )}
        </div>

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
                className="inline-flex items-center gap-2 rounded-md bg-ink px-5 py-2.5 text-sm text-paper transition hover:bg-ink-700 active:scale-[0.98]"
              >
                Ver mis pisos
                <ArrowRight size={14} weight="bold" className="text-saffron-300" />
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
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-saffron-700">{eyebrow}</p>
        <h2 className="mt-2 font-display text-3xl leading-tight text-ink sm:text-4xl">{title}</h2>
        {subtitle && <p className="mt-2 max-w-[46ch] text-sm text-stone-600">{subtitle}</p>}
      </div>
      <div className="space-y-5">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
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

function Chip({
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
        "inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition active:scale-[0.98]",
        active
          ? "border-ink bg-ink text-paper"
          : "border-hairline bg-paper-50 text-ink-700 hover:border-ink/30"
      )}
    >
      {active && <Check size={13} weight="bold" className="text-saffron-300" />}
      {children}
    </button>
  );
}
