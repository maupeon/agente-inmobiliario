"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { ArrowLeft, ArrowRight, Check } from "@phosphor-icons/react";
import { DEFAULT_SCORE_WEIGHTS, SCORE_LABELS, scoreWeights, validScoreWeights } from "@/lib/personal-score";
import { cn } from "@/lib/utils";
import type {
  CommuteMode,
  Hogar,
  Imprescindible,
  Priority,
  UserProfile,
  ScoreWeights,
} from "@/types";
import type { PickedLocation } from "./LocationPicker";
import { Logo } from "./ui/Logo";

const LocationPicker = dynamic(() => import("./LocationPicker"), {
  ssr: false,
  loading: () => (
    <div className="grid h-[300px] place-items-center rounded-2xl border border-hairline bg-paper-200 text-sm text-stone">
      Cargando mapa…
    </div>
  ),
});

const PRIORITIES: Array<{ key: Priority; label: string }> = [
  { key: "cerca_trabajo", label: "Cerca del trabajo" },
  { key: "transporte", label: "Buen transporte" },
  { key: "zonas_verdes", label: "Zonas verdes" },
  { key: "vida_nocturna", label: "Vida nocturna" },
  { key: "tranquilidad", label: "Tranquilidad" },
];

const MODES: Array<{ key: CommuteMode; label: string }> = [
  { key: "a_pie", label: "A pie" },
  { key: "bici", label: "En bici" },
  { key: "transporte", label: "Transporte público" },
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
  { key: "exterior", label: "Exterior o luminoso" },
  { key: "terraza", label: "Terraza o balcón" },
  { key: "aire_acondicionado", label: "Aire acondicionado" },
  { key: "amueblado", label: "Amueblado" },
  { key: "garaje", label: "Garaje" },
  { key: "trastero", label: "Trastero" },
];

const STEPS = ["Búsqueda", "Sobre ti", "Trabajo", "Prioridades"] as const;

export function Onboarding({
  initial,
  onComplete,
  onSkip,
}: {
  initial?: UserProfile | null;
  onComplete: (profile: UserProfile) => void;
  onSkip: () => void;
}) {
  const [step, setStep] = useState(0);
  const [zoneError, setZoneError] = useState(false);
  const [name, setName] = useState(initial?.name ?? "");
  const [operation, setOperation] = useState<UserProfile["operacion"]>(
    initial?.operacion ?? "alquiler"
  );
  const [propertyType, setPropertyType] = useState<"pisos" | "casas">(
    initial?.tipo ?? "pisos"
  );
  const [zone, setZone] = useState<PickedLocation | null>(
    initial?.zona && initial.zonaLat != null && initial.zonaLon != null
      ? { lat: initial.zonaLat, lon: initial.zonaLon, label: initial.zona }
      : null
  );
  const [budget, setBudget] = useState(
    initial?.presupuestoMax ? String(initial.presupuestoMax) : ""
  );
  const [rooms, setRooms] = useState(
    initial?.habitaciones ? String(initial.habitaciones) : ""
  );
  const [household, setHousehold] = useState<Hogar | undefined>(initial?.hogar);
  const [pet, setPet] = useState<boolean | undefined>(initial?.mascota);
  const [work, setWork] = useState<PickedLocation | null>(
    initial?.trabajo?.lat != null && initial?.trabajo?.lon != null
      ? {
          lat: initial.trabajo.lat,
          lon: initial.trabajo.lon,
          label: initial.trabajo.direccion,
        }
      : null
  );
  const [commuteMode, setCommuteMode] = useState<CommuteMode | undefined>(
    initial?.trabajo?.modo
  );
  const [mustHaves, setMustHaves] = useState<Imprescindible[]>(
    initial?.imprescindibles ?? []
  );
  const [priorities, setPriorities] = useState<Priority[]>(
    initial?.prioridades ?? []
  );

  const [weights, setWeights] = useState<ScoreWeights>(() => scoreWeights(initial?.scoreWeights));
  const [weightsError, setWeightsError] = useState(false);
  const weightTotal = weights.alpha + weights.beta + weights.gamma + weights.delta;
  const unit = operation === "venta" ? "€" : "€/mes";
  const lastStep = step === STEPS.length - 1;

  function buildProfile(): UserProfile {
    return {
      name: name.trim() || undefined,
      operacion: operation,
      tipo: propertyType,
      zona: zone?.label,
      zonaLat: zone?.lat,
      zonaLon: zone?.lon,
      presupuestoMax: budget ? Number(budget) : undefined,
      habitaciones: rooms ? Number(rooms) : undefined,
      hogar: household,
      mascota: pet,
      imprescindibles: mustHaves.length ? mustHaves : undefined,
      trabajo: work
        ? {
            direccion: work.label,
            lat: work.lat,
            lon: work.lon,
            modo: commuteMode,
          }
        : undefined,
      prioridades: priorities.length ? priorities : undefined,
      scoreWeights: weights,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    };
  }

  function requireZone(): boolean {
    if (zone) return true;
    setZoneError(true);
    setStep(0);
    return false;
  }

  function finish() {
    if (!requireZone()) return;
    if (!validScoreWeights(weights)) { setWeightsError(true); setStep(3); return; }
    onComplete(buildProfile());
  }

  function next() {
    if (step === 0 && !requireZone()) return;
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  }

  function toggle<T>(value: T, list: T[], update: (items: T[]) => void) {
    update(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  }

  return (
    <section aria-labelledby="onboarding-title" className="mx-auto max-w-[760px] animate-fade-up">
      <div className="flex items-center justify-between gap-4">
        <Logo variant="inline" className="text-2xl" />
        <button
          type="button"
          onClick={step === 0 ? onSkip : finish}
          className="pressable min-h-11 rounded-lg px-3 text-sm font-medium text-stone-600 hover:bg-paper-200 hover:text-ink"
        >
          {step === 0 ? "Ir a búsqueda rápida" : "Guardar y revisar búsqueda"}
        </button>
      </div>

      <div className="mt-7 flex items-center gap-4" aria-live="polite">
        <div
          role="progressbar"
          aria-label={`Paso ${step + 1} de ${STEPS.length}: ${STEPS[step]}`}
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-valuenow={step + 1}
          className="flex flex-1 gap-1.5"
        >
          {STEPS.map((label, index) => (
            <span
              key={label}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                index <= step ? "bg-saffron-500" : "bg-hairline-strong"
              )}
            />
          ))}
        </div>
        <span className="shrink-0 text-sm font-medium text-stone">
          {step + 1} de {STEPS.length}
        </span>
      </div>

      <div className="glass-surface mt-6 rounded-[1.75rem] p-5 sm:p-8">
        <div className="min-h-[360px]">
          {step === 0 && (
            <Step
              eyebrow="Tu búsqueda"
              title="Empecemos por lo imprescindible"
              subtitle="Puedes preparar la búsqueda desde este paso. Antes de consultar Idealista, revisarás los filtros y confirmarás."
            >
              <ChoiceGroup label="¿Quieres alquilar o comprar?">
                <Segment active={operation === "alquiler"} onClick={() => setOperation("alquiler")}>
                  Alquilar
                </Segment>
                <Segment active={operation === "venta"} onClick={() => setOperation("venta")}>
                  Comprar
                </Segment>
              </ChoiceGroup>

              <ChoiceGroup label="Tipo de vivienda">
                <Segment active={propertyType === "pisos"} onClick={() => setPropertyType("pisos")}>
                  Piso
                </Segment>
                <Segment active={propertyType === "casas"} onClick={() => setPropertyType("casas")}>
                  Casa
                </Segment>
              </ChoiceGroup>

              <div>
                <p className="mb-2 text-sm font-medium text-ink">Zona donde quieres vivir</p>
                <LocationPicker
                  value={zone}
                  onChange={(nextZone) => {
                    setZone(nextZone);
                    setZoneError(false);
                  }}
                  accent="#176547"
                  searchPlaceholder="Barrio o ciudad: Chamberí, Madrid…"
                />
                {zoneError && (
                  <p role="alert" className="mt-2 text-sm font-medium text-rose-500">
                    Elige una zona para poder buscar viviendas.
                  </p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <InputField label={`Presupuesto máximo (${unit})`} htmlFor="profile-budget">
                  <div className="relative">
                    <input
                      id="profile-budget"
                      inputMode="numeric"
                      value={budget}
                      onChange={(event) => setBudget(event.target.value.replace(/[^\d]/g, ""))}
                      placeholder={operation === "venta" ? "320000" : "1400"}
                      className={cn(inputClass, "pr-20")}
                    />
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-stone">
                      {unit}
                    </span>
                  </div>
                </InputField>

                <ChoiceGroup label="Habitaciones mínimas">
                  {['1', '2', '3', '4'].map((number) => (
                    <Segment
                      key={number}
                      active={rooms === number}
                      onClick={() => setRooms(rooms === number ? "" : number)}
                    >
                      {number}{number === "4" ? "+" : ""}
                    </Segment>
                  ))}
                </ChoiceGroup>
              </div>
            </Step>
          )}

          {step === 1 && (
            <Step
              eyebrow="Personalización opcional"
              title="Cuéntanos un poco sobre ti"
              subtitle="Usamos estas respuestas para priorizar, nunca para excluir opciones por ti."
            >
              <InputField label="Tu nombre (opcional)" htmlFor="profile-name">
                <input
                  id="profile-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="given-name"
                  placeholder="¿Cómo te llamamos?"
                  className={inputClass}
                />
              </InputField>

              <ChoiceGroup label="¿Con quién vivirás?">
                {HOGARES.map((item) => (
                  <Segment
                    key={item.key}
                    active={household === item.key}
                    onClick={() => setHousehold(household === item.key ? undefined : item.key)}
                  >
                    {item.label}
                  </Segment>
                ))}
              </ChoiceGroup>

              <ChoiceGroup label="¿Tienes mascota?">
                <Segment active={pet === true} onClick={() => setPet(pet === true ? undefined : true)}>
                  Sí
                </Segment>
                <Segment active={pet === false} onClick={() => setPet(pet === false ? undefined : false)}>
                  No
                </Segment>
              </ChoiceGroup>
            </Step>
          )}

          {step === 2 && (
            <Step
              eyebrow="Tu día a día"
              title="Compara los trayectos"
              subtitle="Añade tu trabajo o lugar habitual y calcularemos el tiempo desde cada vivienda. Puedes omitirlo."
            >
              <LocationPicker
                value={work}
                onChange={setWork}
                accent="#17211D"
                searchPlaceholder="Dirección o zona habitual…"
                defaultCenter={zone ? { lat: zone.lat, lon: zone.lon, zoom: 12 } : undefined}
              />

              <ChoiceGroup label="¿Cómo te mueves normalmente?">
                {MODES.map((item) => (
                  <Segment
                    key={item.key}
                    active={commuteMode === item.key}
                    onClick={() => setCommuteMode(commuteMode === item.key ? undefined : item.key)}
                  >
                    {item.label}
                  </Segment>
                ))}
              </ChoiceGroup>
            </Step>
          )}

          {step === 3 && (
            <Step
              eyebrow="El toque final"
              title="¿Qué hace que una vivienda encaje?"
              subtitle="Marca tantas opciones como quieras. Podrás cambiarlas después."
            >
              <fieldset className="rounded-2xl border border-hairline bg-paper-200/60 p-4">
                <legend className="px-1 text-base font-semibold text-ink">Tu Score HabitIA</legend>
                <p className="text-sm leading-relaxed text-stone-600">Reparte 100 puntos según lo que te importe. Por defecto, cada factor pesa un 25%. El resultado ordenará tus viviendas.</p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {(Object.keys(SCORE_LABELS) as Array<keyof ScoreWeights>).map((key) => (
                    <InputField key={key} label={SCORE_LABELS[key]} htmlFor={`score-${key}`}>
                      <input id={`score-${key}`} type="number" min={0} max={100} step={1} value={weights[key]}
                        onChange={(event) => { setWeights({ ...weights, [key]: Number(event.target.value) }); setWeightsError(false); }}
                        className={inputClass} aria-describedby="score-weights-help" />
                    </InputField>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <p id="score-weights-help" role="status" className={cn("text-sm font-medium", validScoreWeights(weights) ? "text-saffron-700" : "text-rose-700")}>Total: {weightTotal}% · debe sumar 100%</p>
                  <button type="button" onClick={() => { setWeights({ ...DEFAULT_SCORE_WEIGHTS }); setWeightsError(false); }} className="min-h-11 rounded-lg px-2 text-sm underline">Restablecer 25% cada uno</button>
                </div>
                {weightsError && <p role="alert" className="text-sm text-rose-700">Los cuatro pesos deben ser enteros entre 0 y 100 y sumar exactamente 100.</p>}
                <p className="mt-2 text-xs leading-relaxed text-stone-600">Fair compara el precio con la estimación; Opportunity, con el intervalo. Zone mide cercanía al punto elegido y Lifestyle usa presupuesto, trayecto e imprescindibles. Si falta un dato, lo indicamos y ese factor no aporta puntos. Los precios del modelo son escenarios basados en oferta de 2018.</p>
              </fieldset>
              <ChoiceGroup label="Preferencias del barrio (contexto para el asistente)">
                {PRIORITIES.map((item) => (
                  <Chip
                    key={item.key}
                    active={priorities.includes(item.key)}
                    onClick={() => toggle(item.key, priorities, setPriorities)}
                  >
                    {item.label}
                  </Chip>
                ))}
              </ChoiceGroup>

              <p className="text-xs leading-relaxed text-stone-600">Transporte, zonas verdes, vida nocturna y tranquilidad no tienen indicadores verificados para puntuar barrios. Seguridad no se muestra como índice.</p>
              <ChoiceGroup label="Imprescindibles de la vivienda">
                {MUST.map((item) => (
                  <Chip
                    key={item.key}
                    active={mustHaves.includes(item.key)}
                    onClick={() => toggle(item.key, mustHaves, setMustHaves)}
                  >
                    {item.label}
                  </Chip>
                ))}
              </ChoiceGroup>
            </Step>
          )}
        </div>

        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-hairline pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((current) => current - 1)}
                className="pressable inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 font-medium text-stone-600 hover:bg-paper-200 hover:text-ink sm:w-auto"
              >
                <ArrowLeft aria-hidden size={16} weight="bold" />
                Atrás
              </button>
            )}
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            {step === 0 ? (
              <>
                <button
                  type="button"
                  onClick={next}
                  className="pressable inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 font-medium text-stone-600 hover:bg-paper-200 hover:text-ink"
                >
                  Personalizar
                  <ArrowRight aria-hidden size={15} weight="bold" />
                </button>
                <button
                  type="button"
                  onClick={finish}
                  className="pressable inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-ink px-5 font-medium text-paper shadow-lift hover:bg-ink-700"
                >
                  Preparar búsqueda
                  <ArrowRight aria-hidden size={16} weight="bold" className="text-saffron-300" />
                </button>
              </>
            ) : lastStep ? (
              <button
                type="button"
                onClick={finish}
                className="pressable inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-ink px-5 font-medium text-paper shadow-lift hover:bg-ink-700"
              >
                Guardar y revisar búsqueda
                <ArrowRight aria-hidden size={16} weight="bold" className="text-saffron-300" />
              </button>
            ) : (
              <button
                type="button"
                onClick={next}
                className="pressable inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-ink px-5 font-medium text-paper shadow-lift hover:bg-ink-700"
              >
                Siguiente
                <ArrowRight aria-hidden size={16} weight="bold" className="text-saffron-300" />
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

const inputClass =
  "h-12 w-full rounded-xl border border-hairline bg-paper-50 px-4 text-ink shadow-nudge placeholder:text-stone-400 focus:border-saffron-500 focus:outline-none";

function Step({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="animate-fade-up space-y-6">
      <div>
        <p className="text-sm font-semibold text-saffron-700">{eyebrow}</p>
        <h1 id="onboarding-title" className="mt-2 text-balance text-3xl font-semibold leading-tight tracking-[-0.04em] text-ink sm:text-4xl">
          {title}
        </h1>
        <p className="mt-2 max-w-[58ch] text-sm leading-relaxed text-stone-600 sm:text-base">{subtitle}</p>
      </div>
      <div className="space-y-6">{children}</div>
    </div>
  );
}

function InputField({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-2 block text-sm font-medium text-ink">
        {label}
      </label>
      {children}
    </div>
  );
}

function ChoiceGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-ink">{label}</legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
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
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "pressable min-h-11 rounded-xl border px-4 text-sm font-medium",
        active
          ? "border-ink bg-ink text-paper shadow-nudge"
          : "border-hairline bg-paper-50 text-ink-700 hover:border-saffron-300 hover:bg-saffron-50"
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
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "pressable inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-medium",
        active
          ? "border-saffron-700 bg-saffron-50 text-saffron-700"
          : "border-hairline bg-paper-50 text-ink-700 hover:border-saffron-300"
      )}
    >
      {active && <Check aria-hidden size={14} weight="bold" />}
      {children}
    </button>
  );
}
