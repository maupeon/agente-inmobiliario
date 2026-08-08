"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import {
  ArrowSquareOut,
  Bed,
  Buildings,
  Heart,
  ListBullets,
  MagnifyingGlass,
  MapTrifold,
  PencilSimple,
} from "@phosphor-icons/react";
import { useFavorites } from "@/hooks/useFavorites";
import { useProfile } from "@/hooks/useProfile";
import { readLastSearch } from "@/lib/last-search";
import {
  BANDA_COLOR,
  MODE_LABEL,
  bandaColor,
  formatDiff,
  safetyColor,
} from "@/lib/dashboard-format";
import { cn, formatEUR, formatNumber } from "@/lib/utils";
import type {
  Property,
  PropertyEnrichment,
  PropertyRecommendation,
  PropertyValuation,
} from "@/types";
import { SiteNav } from "./SiteNav";
import { Onboarding } from "./Onboarding";
import { PropertyDetailDrawer } from "./PropertyDetailDrawer";

const MapPanel = dynamic(() => import("./MapPanel"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center bg-paper-200 font-mono text-[10px] uppercase tracking-[0.2em] text-stone">
      Cargando mapa…
    </div>
  ),
});

type Source = "para_ti" | "favoritos" | "busqueda";

interface ViewItem {
  property: Property;
  enrichment: PropertyEnrichment | null;
  rationale?: string;
  rank?: number;
}

interface FilterForm {
  zona: string;
  operacion: "alquiler" | "venta";
  precioMax: string;
  habitaciones: string;
}

const EMPTY_ENRICH: Record<string, PropertyEnrichment> = {};

export function Dashboard() {
  const searchParams = useSearchParams();
  const { profile, loaded, save } = useProfile();
  const favs = useFavorites();

  const launchZone = searchParams.get("zona")?.trim() ?? "";
  const launchOperation: FilterForm["operacion"] =
    searchParams.get("operacion") === "venta" ? "venta" : "alquiler";
  const hasLaunchSearch = launchZone.length > 0;

  const [skipped, setSkipped] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [lastSearch, setLastSearch] = useState<Property[]>([]);
  const [source, setSource] = useState<Source>("para_ti");
  const [mobileView, setMobileView] = useState<"list" | "map">("list");
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<ViewItem | null>(null);
  const [showSafety, setShowSafety] = useState(true);
  const [showTrajectory, setShowTrajectory] = useState(true);

  // "Para ti"
  const [recs, setRecs] = useState<PropertyRecommendation[]>([]);
  const [recIntro, setRecIntro] = useState<string | null>(null);
  const [recLoading, setRecLoading] = useState(false);
  const [recError, setRecError] = useState<string | null>(null);
  const recRequestRef = useRef(0);
  const [form, setForm] = useState<FilterForm>({
    zona: launchZone,
    operacion: launchOperation,
    precioMax: "",
    habitaciones: "",
  });
  const [applied, setApplied] = useState<FilterForm>(form);

  // Enriquecimiento para favoritos / búsqueda
  const [enrichCache, setEnrichCache] = useState<{ key: string; map: Record<string, PropertyEnrichment> }>(
    { key: "", map: {} }
  );
  const [enriching, setEnriching] = useState(false);
  const enrichRequestRef = useRef(0);

  useEffect(() => {
    setLastSearch(readLastSearch().properties);
  }, []);

  // Inicializa filtros desde el perfil una sola vez.
  const initRef = useRef(false);
  useEffect(() => {
    if (initRef.current || !profile || hasLaunchSearch) return;
    initRef.current = true;
    const f: FilterForm = {
      zona: profile.zona ?? "",
      operacion: profile.operacion ?? "alquiler",
      precioMax: profile.presupuestoMax ? String(profile.presupuestoMax) : "",
      habitaciones: profile.habitaciones ? String(profile.habitaciones) : "",
    };
    setForm(f);
    setApplied(f);
  }, [hasLaunchSearch, profile]);

  const work = useMemo(() => {
    const t = profile?.trabajo;
    if (t?.lat != null && t?.lon != null) {
      return { lat: t.lat, lon: t.lon, label: t.direccion };
    }
    return null;
  }, [profile]);

  const recProfileKey = useMemo(() => JSON.stringify(profile ?? null), [profile]);
  const enrichProfileKey = useMemo(
    () => JSON.stringify(profile?.trabajo ?? null),
    [profile]
  );
  const appliedKey = JSON.stringify(applied);

  // ── "Para ti": busca + rankea desde el perfil/filtros ──
  useEffect(() => {
    const requestId = ++recRequestRef.current;
    if (source !== "para_ti") {
      setRecLoading(false);
      return;
    }
    const zona = applied.zona.trim();
    if (!zona) {
      setRecs([]);
      setRecLoading(false);
      return;
    }
    const ctrl = new AbortController();
    setRecLoading(true);
    setRecError(null);
    fetch("/api/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profile,
        zona,
        operacion: applied.operacion,
        precioMax: applied.precioMax ? Number(applied.precioMax) : undefined,
        habitaciones: applied.habitaciones ? Number(applied.habitaciones) : undefined,
      }),
      signal: ctrl.signal,
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("HTTP"))))
      .then((d: { items?: PropertyRecommendation[]; intro?: string | null }) => {
        if (ctrl.signal.aborted || requestId !== recRequestRef.current) return;
        setRecs(d.items ?? []);
        setRecIntro(d.intro ?? null);
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setRecError("No he podido cargar recomendaciones.");
      })
      .finally(() => {
        if (!ctrl.signal.aborted && requestId === recRequestRef.current) {
          setRecLoading(false);
        }
      });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedKey, recProfileKey, source]);

  // ── Favoritos / búsqueda: enriquece lo que falta ──
  const enrichList = useMemo(
    () => (source === "favoritos" ? favs.favorites : source === "busqueda" ? lastSearch : []),
    [source, favs.favorites, lastSearch]
  );
  const enrichListKey = enrichList.map((p) => p.propertyCode).join(",");
  const enrichments = enrichCache.key === enrichProfileKey ? enrichCache.map : EMPTY_ENRICH;

  useEffect(() => {
    const requestId = ++enrichRequestRef.current;
    if (source === "para_ti") {
      setEnriching(false);
      return;
    }
    const base = enrichCache.key === enrichProfileKey ? enrichCache.map : {};
    const missing = enrichList.filter((p) => !base[p.propertyCode]).slice(0, 24);
    if (missing.length === 0) {
      setEnriching(false);
      if (enrichCache.key !== enrichProfileKey) setEnrichCache({ key: enrichProfileKey, map: base });
      return;
    }
    const ctrl = new AbortController();
    setEnriching(true);
    fetch("/api/enrich", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ properties: missing, profile }),
      signal: ctrl.signal,
    })
      .then((r) => (r.ok ? r.json() : { enrichments: [] }))
      .then((data: { enrichments?: PropertyEnrichment[] }) => {
        if (ctrl.signal.aborted || requestId !== enrichRequestRef.current) return;
        const add: Record<string, PropertyEnrichment> = {};
        for (const e of data.enrichments ?? []) add[e.propertyCode] = e;
        setEnrichCache((prev) => {
          const baseMap = prev.key === enrichProfileKey ? prev.map : {};
          return { key: enrichProfileKey, map: { ...baseMap, ...add } };
        });
      })
      .catch(() => {})
      .finally(() => {
        if (!ctrl.signal.aborted && requestId === enrichRequestRef.current) {
          setEnriching(false);
        }
      });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enrichListKey, enrichProfileKey, source]);

  // ── Modelo de vista por fuente ──
  const items: ViewItem[] = useMemo(() => {
    if (source === "para_ti") {
      return recs.map((r, i) => ({
        property: r.property,
        enrichment: r.enrichment,
        rationale: r.rationale,
        rank: i + 1,
      }));
    }
    return enrichList.map((p) => ({
      property: p,
      enrichment: enrichments[p.propertyCode] ?? null,
    }));
  }, [source, recs, enrichList, enrichments]);

  useEffect(() => {
    if (!selectedCode) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document
      .getElementById(`card-${selectedCode}`)
      ?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest" });
  }, [selectedCode]);

  // El perfil personaliza, pero una búsqueda lanzada desde la home entra directa.
  if (loaded && ((!profile && !skipped && !hasLaunchSearch) || editingProfile)) {
    return (
      <>
        <SiteNav />
        <main className="relative z-10 mx-auto w-full max-w-[820px] px-5 pb-20 pt-8 sm:px-8 sm:pt-12">
          <Onboarding
            initial={editingProfile ? profile : null}
            onComplete={(nextProfile) => {
              save(nextProfile);
              const nextForm: FilterForm = {
                zona: nextProfile.zona ?? "",
                operacion: nextProfile.operacion,
                precioMax: nextProfile.presupuestoMax
                  ? String(nextProfile.presupuestoMax)
                  : "",
                habitaciones: nextProfile.habitaciones
                  ? String(nextProfile.habitaciones)
                  : "",
              };
              setForm(nextForm);
              setApplied(nextForm);
              setEditingProfile(false);
            }}
            onSkip={() => {
              setEditingProfile(false);
              setSkipped(true);
            }}
          />
        </main>
      </>
    );
  }

  const counts = {
    para_ti: recs.length,
    favoritos: favs.favorites.length,
    busqueda: lastSearch.length,
  };
  const busy = source === "para_ti" ? recLoading : enriching;
  const operationLabel = applied.operacion === "venta" ? "Comprar" : "Alquilar";
  const heading =
    source === "para_ti"
      ? applied.zona
        ? `${operationLabel} en ${applied.zona}`
        : "Encuentra tu próxima vivienda"
      : source === "favoritos"
      ? "Viviendas guardadas"
      : "Tu última búsqueda";
  const plottableCount = items.filter(
    (it) => it.property.latitude != null && it.property.longitude != null
  ).length;

  return (
    <>
      <SiteNav />
      <main className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-[1400px] flex-col px-5 pb-20 pt-8 sm:px-8 sm:pt-10 lg:px-12">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-saffron-700">
              <MagnifyingGlass aria-hidden size={15} weight="bold" />
              Buscar vivienda
            </div>
            <h1 className="mt-2 text-balance text-3xl font-semibold leading-tight tracking-[-0.045em] text-ink sm:text-4xl">
              {heading}
            </h1>
            <p className="mt-2 max-w-[64ch] text-sm leading-relaxed text-stone-600 sm:text-base">
              {source === "para_ti"
                ? "Compara las opciones por precio, zona y trayecto. Los indicadores son orientativos; confirma siempre la disponibilidad en el anuncio."
                : "Vuelve a tus viviendas y compáralas con el mismo contexto."}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div
              role="tablist"
              aria-label="Colección de viviendas"
              className="flex min-w-0 gap-1 overflow-x-auto rounded-xl bg-paper-200 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {(["para_ti", "favoritos", "busqueda"] as Source[]).map((item) => {
                const active = source === item;
                const label =
                  item === "para_ti"
                    ? "Resultados"
                    : item === "favoritos"
                    ? "Guardados"
                    : "Última búsqueda";
                return (
                  <button
                    key={item}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => {
                      setSource(item);
                      setSelectedCode(null);
                    }}
                    className={cn(
                      "pressable min-h-11 shrink-0 rounded-lg px-3.5 text-sm font-medium",
                      active
                        ? "bg-paper-50 text-ink shadow-nudge"
                        : "text-stone-600 hover:text-ink"
                    )}
                  >
                    {label}
                    <span className="ml-1.5 text-xs text-stone">{counts[item]}</span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setEditingProfile(true)}
              className="pressable inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-hairline bg-paper-50 px-4 text-sm font-medium text-ink hover:border-saffron-300"
            >
              <PencilSimple aria-hidden size={15} weight="bold" />
              Preferencias
            </button>
          </div>
        </div>

        {source === "para_ti" && (
          <FilterBar
            form={form}
            setForm={setForm}
            onApply={() => setApplied(form)}
            busy={recLoading}
          />
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Toggle on={showSafety} onClick={() => setShowSafety((value) => !value)}>
              Seguridad
            </Toggle>
            <Toggle on={showTrajectory} onClick={() => setShowTrajectory((value) => !value)}>
              Trayecto
            </Toggle>
            {busy && (
              <span role="status" className="ml-1 animate-pulse-soft text-sm font-medium text-stone">
                {source === "para_ti" ? "Buscando para ti…" : "Calculando contexto…"}
              </span>
            )}
          </div>

          {items.length > 0 && (
            <div className="flex rounded-xl bg-paper-200 p-1 lg:hidden" aria-label="Vista de resultados">
              <ViewButton active={mobileView === "list"} onClick={() => setMobileView("list")}>
                <ListBullets aria-hidden size={16} weight="bold" /> Lista
              </ViewButton>
              <ViewButton active={mobileView === "map"} onClick={() => setMobileView("map")}>
                <MapTrifold aria-hidden size={16} weight="bold" /> Mapa
              </ViewButton>
            </div>
          )}

          <div className="hidden sm:block">
            <Legend />
          </div>
        </div>

        {!work && source === "para_ti" && (
          <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-saffron-200 bg-saffron-50 px-4 py-3 text-sm text-ink-700 sm:flex-row sm:items-center sm:justify-between">
            <p>
              ¿Quieres comparar trayectos? Añade tu trabajo o lugar habitual; es opcional.
            </p>
            <button
              type="button"
              onClick={() => setEditingProfile(true)}
              className="pressable min-h-10 shrink-0 rounded-lg bg-white px-3 font-medium text-saffron-700 shadow-nudge"
            >
              Añadir ubicación
            </button>
          </div>
        )}

        {source === "para_ti" && recIntro && items.length > 0 && (
          <p className="mt-4 rounded-2xl border border-hairline bg-paper-50 px-4 py-3 text-sm leading-relaxed text-ink-700">
            <span className="font-semibold text-saffron-700">Resumen de HabitIA: </span>
            {recIntro}
          </p>
        )}

        {recError && source === "para_ti" ? (
          <p role="alert" className="mt-6 rounded-2xl border border-rose-500/30 bg-rose-50 p-4 text-sm text-ink-700">
            {recError} Revisa la zona o inténtalo de nuevo.
          </p>
        ) : items.length === 0 ? (
          <EmptyPanel source={source} loading={busy} hasZona={!!applied.zona.trim()} />
        ) : (
          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
            <div className={cn(mobileView === "list" ? "hidden lg:block" : "block")}>
              <div className="sticky top-20 h-[62dvh] min-h-[480px] overflow-hidden rounded-2xl border border-hairline-strong bg-paper-200 shadow-hairline lg:h-[calc(100dvh-7rem)] lg:max-h-[760px]">
                <MapPanel
                  items={items}
                  work={work}
                  selectedCode={selectedCode}
                  onSelect={setSelectedCode}
                  showSafety={showSafety}
                  showTrajectory={showTrajectory}
                />
              </div>
            </div>

            <div className={cn("space-y-3", mobileView === "map" ? "hidden lg:block" : "block")}>
              <div className="flex items-center justify-between gap-3 px-1">
                <p className="text-sm font-semibold text-ink">
                  {items.length} vivienda{items.length === 1 ? "" : "s"}
                </p>
                <p className="text-xs text-stone">
                  {plottableCount} en el mapa
                </p>
              </div>
              {items.map((item) => (
                <PropertyRow
                  key={item.property.propertyCode}
                  item={item}
                  selected={item.property.propertyCode === selectedCode}
                  hasWork={!!work}
                  isFavorite={favs.isFavorite(item.property.propertyCode)}
                  onSelect={() =>
                    setSelectedCode(
                      selectedCode === item.property.propertyCode
                        ? null
                        : item.property.propertyCode
                    )
                  }
                  onToggleFavorite={() => favs.toggleFavorite(item.property)}
                  onOpenDetail={() => setDetailItem(item)}
                />
              ))}
            </div>
          </div>
        )}

      </main>
      <PropertyDetailDrawer
        item={detailItem}
        isFavorite={detailItem ? favs.isFavorite(detailItem.property.propertyCode) : false}
        onToggleFavorite={() => detailItem && favs.toggleFavorite(detailItem.property)}
        onClose={() => setDetailItem(null)}
      />
    </>
  );
}

function FilterBar({
  form,
  setForm,
  onApply,
  busy,
}: {
  form: FilterForm;
  setForm: (f: FilterForm) => void;
  onApply: () => void;
  busy: boolean;
}) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onApply();
      }}
      className="glass-surface mt-6 grid gap-3 rounded-2xl p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-[auto,minmax(220px,1fr),150px,110px,auto] lg:items-end"
      aria-label="Criterios de búsqueda"
    >
      <fieldset>
        <legend className="mb-1.5 block text-xs font-medium text-stone-600">Operación</legend>
        <div className="flex rounded-xl bg-paper-200 p-1">
          {(["alquiler", "venta"] as const).map((operation) => {
            const active = form.operacion === operation;
            return (
              <button
                key={operation}
                type="button"
                aria-pressed={active}
                onClick={() => setForm({ ...form, operacion: operation })}
                className={cn(
                  "pressable min-h-11 flex-1 rounded-lg px-3 text-sm font-medium",
                  active ? "bg-paper-50 text-ink shadow-nudge" : "text-stone-600 hover:text-ink"
                )}
              >
                {operation === "alquiler" ? "Alquilar" : "Comprar"}
              </button>
            );
          })}
        </div>
      </fieldset>

      <Field label="Zona o ciudad" htmlFor="search-zone">
        <input
          id="search-zone"
          value={form.zona}
          onChange={(event) => setForm({ ...form, zona: event.target.value })}
          placeholder="Chamberí, Madrid"
          autoComplete="address-level2"
          className={inputCls}
        />
      </Field>

      <Field
        label={`Precio máx. (${form.operacion === "venta" ? "€" : "€/mes"})`}
        htmlFor="search-price"
      >
        <input
          id="search-price"
          inputMode="numeric"
          value={form.precioMax}
          onChange={(event) =>
            setForm({ ...form, precioMax: event.target.value.replace(/[^\d]/g, "") })
          }
          placeholder="Sin límite"
          className={inputCls}
        />
      </Field>

      <Field label="Habitaciones" htmlFor="search-rooms">
        <select
          id="search-rooms"
          value={form.habitaciones}
          onChange={(event) => setForm({ ...form, habitaciones: event.target.value })}
          className={inputCls}
        >
          <option value="">Cualquiera</option>
          {["1", "2", "3", "4"].map((number) => (
            <option key={number} value={number}>
              {number}
              {number === "4" ? "+" : ""}
            </option>
          ))}
        </select>
      </Field>

      <button
        type="submit"
        disabled={busy || !form.zona.trim()}
        className="pressable inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-ink px-5 text-sm font-medium text-paper shadow-lift hover:bg-ink-700 disabled:cursor-not-allowed disabled:opacity-45"
      >
        <MagnifyingGlass aria-hidden size={16} weight="bold" className="text-saffron-300" />
        {busy ? "Buscando…" : "Buscar"}
      </button>
    </form>
  );
}

const inputCls =
  "h-12 w-full rounded-xl border border-hairline bg-paper-50 px-3.5 text-sm text-ink shadow-nudge placeholder:text-stone-400 focus:border-saffron-500 focus:outline-none";

function Field({
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
      <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-medium text-stone-600">
        {label}
      </label>
      {children}
    </div>
  );
}

function Toggle({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "pressable inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 text-xs font-medium",
        on
          ? "border-saffron-700 bg-saffron-50 text-saffron-700"
          : "border-hairline bg-paper-50 text-stone-600 hover:border-saffron-300"
      )}
    >
      <span className={cn("h-2 w-2 rounded-full", on ? "bg-saffron-700" : "bg-mist")} />
      {children}
    </button>
  );
}

function ViewButton({
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
        "pressable inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-xs font-medium",
        active ? "bg-paper-50 text-ink shadow-nudge" : "text-stone-600"
      )}
    >
      {children}
    </button>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-stone" aria-label="Leyenda del mapa">
      <span className="font-medium text-stone-600">Precio:</span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full" style={{ background: BANDA_COLOR.barato }} /> favorable
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full" style={{ background: BANDA_COLOR.en_linea }} /> en línea
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full" style={{ background: BANDA_COLOR.muy_caro }} /> alto
      </span>
    </div>
  );
}

function eurM2Label(v: number, op: "alquiler" | "venta"): string {
  return op === "alquiler" ? `${v} €/m²·mes` : `${formatNumber(Math.round(v))} €/m²`;
}

function PropertyRow({
  item,
  selected,
  hasWork,
  isFavorite,
  onSelect,
  onToggleFavorite,
  onOpenDetail,
}: {
  item: ViewItem;
  selected: boolean;
  hasWork: boolean;
  isFavorite: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
  onOpenDetail: () => void;
}) {
  const { property, enrichment, rationale, rank } = item;
  const val = enrichment?.valuation ?? null;
  const commute = enrichment?.commute ?? null;
  const safety = enrichment?.neighborhood?.seguridad ?? null;
  const leg = commute?.modos.find((m) => m.modo === commute.recomendado) ?? null;
  const noCoords = property.latitude == null || property.longitude == null;
  const op = property.operation === "rent" ? "alquiler" : "venta";

  return (
    <article
      id={`card-${property.propertyCode}`}
      className={cn(
        "rounded-2xl border bg-paper-50 p-3 transition",
        selected
          ? "border-saffron-700 shadow-lift"
          : "border-hairline shadow-hairline hover:border-saffron-300"
      )}
    >
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onSelect}
          aria-label={`Mostrar ${property.title} en el mapa`}
          className="pressable relative h-24 w-28 shrink-0 overflow-hidden rounded-xl bg-paper-200 text-left sm:h-28 sm:w-36"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={property.thumbnail}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
          {rank && (
            <span className="absolute left-2 top-2 grid h-7 min-w-7 place-items-center rounded-full bg-ink px-1 text-xs font-semibold text-paper shadow-lift">
              {rank}
            </span>
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <button type="button" onClick={onSelect} className="min-w-0 flex-1 text-left">
              <p className="line-clamp-2 text-base font-semibold leading-snug tracking-[-0.02em] text-ink">
                {property.title}
              </p>
              <p className="mt-1 line-clamp-1 text-xs text-stone">
                {[property.district, property.municipality].filter(Boolean).join(" · ") || "Zona no indicada"}
                {noCoords && " · sin ubicación"}
              </p>
            </button>
            <button
              type="button"
              onClick={onToggleFavorite}
              aria-label={isFavorite ? "Quitar de guardados" : "Guardar vivienda"}
              aria-pressed={isFavorite}
              className="pressable grid h-11 w-11 shrink-0 place-items-center rounded-full border border-hairline bg-paper-50 text-stone hover:border-saffron-300 hover:text-saffron-700"
            >
              <Heart
                aria-hidden
                size={18}
                weight={isFavorite ? "fill" : "regular"}
                className={isFavorite ? "text-saffron-700" : ""}
              />
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-xl font-semibold tracking-[-0.025em] text-ink">
              {formatEUR(property.price)}
            </span>
            {property.operation === "rent" && <span className="text-xs text-stone">/mes</span>}
            {property.pricePerSqm && (
              <span className="text-xs text-stone">{eurM2Label(property.pricePerSqm, op)}</span>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-600">
            <span className="inline-flex items-center gap-1">
              <Bed aria-hidden size={14} weight="bold" /> {property.rooms} hab.
            </span>
            <span className="inline-flex items-center gap-1">
              <Buildings aria-hidden size={14} weight="bold" /> {formatNumber(property.size)} m²
            </span>
          </div>
        </div>
      </div>

      {rationale && <p className="mt-3 text-sm leading-relaxed text-ink-700">{rationale}</p>}

      <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-paper-200/75 p-3">
        <Signal label="Precio">
          <PriceBadge val={val} />
        </Signal>
        <Signal label="Trayecto">
          {!hasWork ? (
            <span className="text-stone">Sin configurar</span>
          ) : leg?.minutos != null ? (
            <span className="text-ink">
              {leg.minutos} min{" "}
              <span className="text-stone">
                {commute?.recomendado ? MODE_LABEL[commute.recomendado] : ""}
              </span>
            </span>
          ) : (
            <span className="text-stone">Sin dato</span>
          )}
        </Signal>
        <Signal label="Barrio">
          {safety?.indice != null ? (
            <span className="inline-flex items-center gap-1.5 text-ink">
              <span className="h-2 w-2 rounded-full" style={{ background: safetyColor(safety.indice) }} />
              {safety.indice}/100
            </span>
          ) : (
            <span className="text-stone">Sin dato</span>
          )}
        </Signal>
      </div>

      {selected && (val || enrichment?.neighborhood?.resumen) && (
        <div className="mt-3 space-y-1.5 border-t border-hairline pt-3 text-sm leading-relaxed text-ink-700">
          {val && (
            <p>
              La vivienda pide <strong className="text-ink">{formatEUR(property.price)}</strong>
              {property.operation === "rent" ? "/mes" : ""}; {val.etiqueta ?? "no hay referencia comparable"}.
            </p>
          )}
          {enrichment?.neighborhood?.resumen && (
            <p className="text-stone-600">{enrichment.neighborhood.resumen}</p>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-hairline pt-3">
        <button
          type="button"
          onClick={onOpenDetail}
          className="pressable inline-flex min-h-10 items-center rounded-lg bg-ink px-3.5 text-xs font-semibold text-paper hover:bg-ink-700"
        >
          Ver detalles
        </button>
        <a
          href={property.url}
          target="_blank"
          rel="noopener noreferrer"
          className="pressable inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-saffron-700 hover:bg-saffron-50"
        >
          Ver anuncio <ArrowSquareOut aria-hidden size={13} weight="bold" />
        </a>
      </div>
    </article>
  );
}

function Signal({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-medium text-stone">{label}</p>
      <p className="mt-1 text-xs font-medium sm:text-sm">{children}</p>
    </div>
  );
}

function PriceBadge({ val }: { val: PropertyValuation | null }) {
  if (!val || val.diferenciaPorcentual == null) return <span className="text-stone">—</span>;
  return (
    <span className="inline-flex items-center gap-1.5" style={{ color: bandaColor(val.banda) }}>
      <span className="h-2 w-2 rounded-full" style={{ background: bandaColor(val.banda) }} />
      <span className="font-medium">{formatDiff(val.diferenciaPorcentual)}</span>
    </span>
  );
}

function EmptyPanel({
  source,
  loading,
  hasZona,
}: {
  source: Source;
  loading: boolean;
  hasZona: boolean;
}) {
  if (loading) {
    return (
      <div role="status" className="mt-8 grid min-h-56 place-items-center rounded-2xl border border-hairline bg-paper-50 p-8 text-center">
        <div>
          <span className="mx-auto block h-8 w-8 animate-spin rounded-full border-2 border-hairline-strong border-t-saffron-700" />
          <p className="mt-4 font-medium text-ink">Buscando viviendas que encajen…</p>
          <p className="mt-1 text-sm text-stone">Estamos comparando precio y contexto de la zona.</p>
        </div>
      </div>
    );
  }

  const copy =
    source === "para_ti"
      ? hasZona
        ? "No he encontrado pisos con esos criterios. Prueba a ampliar el presupuesto o la zona."
        : "Dime en qué zona buscas (arriba) y te enseño los pisos que mejor encajan contigo."
      : source === "favoritos"
      ? "Aún no has guardado favoritos. Marca el corazón en cualquier piso y aparecerá aquí."
      : "Aún no hay una búsqueda reciente. Puedes buscar aquí o pedirle una comparación al asistente.";

  return (
    <div className="mt-8 rounded-2xl border border-dashed border-hairline-strong bg-paper-50 p-8 text-center sm:p-12">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-saffron-50 text-saffron-700">
        <Buildings aria-hidden size={23} weight="duotone" />
      </span>
      <p className="mt-4 text-xl font-semibold tracking-[-0.025em] text-ink">
        {source === "favoritos"
          ? "Aún no has guardado viviendas"
          : hasZona
          ? "No hay resultados con estos filtros"
          : "Empieza con una zona"}
      </p>
      <p className="mx-auto mt-2 max-w-[50ch] text-sm leading-relaxed text-stone-600">{copy}</p>
    </div>
  );
}
