"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import {
  ArrowSquareOut,
  ArrowClockwise,
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
import { readLastSearch, saveLastSearch, LAST_SEARCH_EVENT } from "@/lib/last-search";
import {
  BANDA_COLOR,
  priceComparison,
} from "@/lib/dashboard-format";
import { recommendationExplanation } from "@/lib/recommend-explanation";
import { personalScore, satisfiesMust } from "@/lib/personal-score";
import { ScoreBreakdown } from "./ScoreBreakdown";
import { cn, formatEUR, formatNumber } from "@/lib/utils";
import type {
  Property,
  SearchFilters,
  PersonalScoring,
  PropertyEnrichment,
  PropertyRecommendation,
  UserProfile,
} from "@/types";
import { SiteNav } from "../layout/SiteNav";
import { Onboarding } from "./Onboarding";
import { PropertyDetailDrawer } from "../property/PropertyDetailDrawer";

const MapPanel = dynamic(() => import("../property/MapPanel"), {
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
  score?: number;
  scoring?: PersonalScoring;
}

interface FilterForm {
  zona: string;
  operacion: "alquiler" | "venta";
  precioMax: string;
  habitaciones: string;
}

interface RecommendResponse {
  items?: PropertyRecommendation[];
  intro?: string | null;
  error?: string;
  filters?: SearchFilters | null;
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
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [storageError, setStorageError] = useState(false);
  const [source, setSource] = useState<Source>("para_ti");
  const [mobileView, setMobileView] = useState<"list" | "map">("list");
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<ViewItem | null>(null);
  const [showTrajectory, setShowTrajectory] = useState(true);

  // "Para ti"
  const [recs, setRecs] = useState<PropertyRecommendation[]>([]);
  const [recIntro, setRecIntro] = useState<string | null>(null);
  const [recLoading, setRecLoading] = useState(false);
  const [recError, setRecError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [pendingSearch, setPendingSearch] = useState<{
    filters: FilterForm;
    profile: UserProfile | null;
  } | null>(null);
  const recControllerRef = useRef<AbortController | null>(null);
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
    const restore = () => {
      const stored = readLastSearch();
      setLastSearch(stored.properties);
      setLastSavedAt(stored.savedAt);
    };
    restore();
    const stored = readLastSearch();
    if (!hasLaunchSearch && stored.source === "dashboard" && stored.savedAt && stored.filters) {
      const restoredForm: FilterForm = { zona: stored.filters.zona, operacion: stored.filters.operacion,
        precioMax: stored.filters.precioMax ? String(stored.filters.precioMax) : "",
        habitaciones: stored.filters.habitaciones ? String(stored.filters.habitaciones) : "" };
      setForm(restoredForm);
      setApplied(restoredForm);
      setRecs(stored.recommendations ?? []);
      setHasSearched(true);
      setSkipped(true);
      initRef.current = true;
    }
    window.addEventListener(LAST_SEARCH_EVENT, restore);
    window.addEventListener("storage", restore);
    return () => { window.removeEventListener(LAST_SEARCH_EVENT, restore); window.removeEventListener("storage", restore); };
  }, [hasLaunchSearch]);

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

  const enrichProfileKey = useMemo(
    () => JSON.stringify(profile?.trabajo ?? null),
    [profile]
  );

  // Montar, cambiar de pestaña o guardar el perfil nunca inicia una búsqueda.
  useEffect(() => () => recControllerRef.current?.abort(), []);

  function prepareSearch(filters: FilterForm) {
    if (recControllerRef.current || !filters.zona.trim()) return;
    setPendingSearch({ filters: { ...filters, zona: filters.zona.trim() }, profile });
  }

  async function confirmSearch() {
    if (!pendingSearch || recControllerRef.current) return;
    const { filters, profile: searchProfile } = pendingSearch;
    const ctrl = new AbortController();
    recControllerRef.current = ctrl;
    setPendingSearch(null);
    setApplied(filters);
    setHasSearched(true);
    setRecs([]);
    setRecIntro(null);
    setSelectedCode(null);
    setRecLoading(true);
    setRecError(null);
    try {
      const response = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmSearch: true,
          profile: searchProfile,
          zona: filters.zona,
          operacion: filters.operacion,
          precioMax: filters.precioMax ? Number(filters.precioMax) : null,
          habitaciones: filters.habitaciones ? Number(filters.habitaciones) : null,
        }),
        signal: ctrl.signal,
      });
      const data = (await response.json().catch(() => ({}))) as RecommendResponse;
      if (!response.ok) {
        throw new Error(data.error ?? "No he podido contactar con el servicio de recomendaciones.");
      }
      if (ctrl.signal.aborted) return;
      const resultItems = data.items ?? [];
      setRecs(resultItems);
      setEnrichCache({ key: JSON.stringify(searchProfile?.trabajo ?? null), map: Object.fromEntries(resultItems.map(r => [r.property.propertyCode, r.enrichment])) });
      setRecIntro(data.intro ?? null);
      setStorageError(!saveLastSearch(resultItems.map((r) => r.property), { source: "dashboard", filters: data.filters, recommendations: resultItems }));
    } catch (error: unknown) {
      if (!ctrl.signal.aborted) {
        setRecError(error instanceof Error ? error.message : "No he podido contactar con el servicio de recomendaciones.");
      }
    } finally {
      if (recControllerRef.current === ctrl) recControllerRef.current = null;
      if (!ctrl.signal.aborted) setRecLoading(false);
    }
  }

  // ── Actualiza los datos de las viviendas cuando cambia el destino o modo ──
  const enrichList = useMemo(
    () => (source === "favoritos" ? favs.favorites : source === "busqueda" ? lastSearch : recs.map(r => r.property)),
    [source, favs.favorites, lastSearch, recs]
  );
  const enrichListKey = enrichList.map((p) => p.propertyCode).join(",");
  const enrichments = enrichCache.key === enrichProfileKey ? enrichCache.map : EMPTY_ENRICH;

  useEffect(() => {
    const requestId = ++enrichRequestRef.current;
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
      const matchesZone = applied.zona.trim().localeCompare(profile?.zona?.trim() ?? "", "es", { sensitivity: "base" }) === 0;
      const scoringProfile = profile ? { ...profile, presupuestoMax: applied.precioMax ? Number(applied.precioMax) : undefined,
        ...(matchesZone ? {} : { zonaLat: undefined, zonaLon: undefined }) } : null;
      return recs.filter((r) => (profile?.imprescindibles ?? []).every((m) => satisfiesMust(r.property, m) !== false))
        .map((r) => {
          const enrichment = enrichments[r.property.propertyCode] ?? { ...r.enrichment, commute: null };
          return { property: r.property, enrichment,
            ...recommendationExplanation(r.property, enrichment, scoringProfile),
            ...personalScore(r.property, enrichment, scoringProfile) };
        })
        .sort((a, b) => b.score - a.score).map((r, i) => ({ ...r, rank: i + 1 }));
    }
    return enrichList.map((p) => ({
      property: p,
      enrichment: enrichments[p.propertyCode] ?? null,
      ...personalScore(p, enrichments[p.propertyCode] ?? { propertyCode: p.propertyCode, valuation: null, neighborhood: null, commute: null }, profile),
    })).sort((a, b) => b.score - a.score);
  }, [source, recs, enrichList, enrichments, profile, applied]);

  useEffect(() => {
    if (!selectedCode) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document
      .getElementById(`card-${selectedCode}`)
      ?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest" });
  }, [selectedCode]);

  // La home y el perfil solo rellenan filtros; buscar requiere confirmación.
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
  const busy = recLoading || enriching;
  const displayedFilters = hasSearched ? applied : form;
  const operationLabel = displayedFilters.operacion === "venta" ? "Comprar" : "Alquilar";
  const heading =
    source === "para_ti"
      ? displayedFilters.zona
        ? `${operationLabel} en ${displayedFilters.zona}`
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
              className="flex min-w-0 flex-wrap gap-1 rounded-xl bg-paper-200 p-1"
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

        <p className="mt-4 text-xs leading-relaxed text-stone-600">
          <strong>Demo compartida del TFM.</strong> Los inmuebles que guardes se almacenan en Supabase y aparecen para todos los visitantes.
        </p>
        {favs.error && <p role="alert" className="mt-2 text-sm text-rose-700">Guardados: {favs.error} <button type="button" className="min-h-11 underline" onClick={() => { void favs.refresh(); }}>Actualizar guardados</button></p>}
        {favs.saving && <p role="status" className="mt-2 text-xs text-stone-600">Guardando cambio en Supabase…</p>}

        {source === "para_ti" && (
          <>
            <FilterBar
              form={form}
              setForm={setForm}
              onApply={() => prepareSearch(form)}
              busy={recLoading}
              ready={loaded}
            />
            <p className="mt-2 text-xs leading-relaxed text-stone-600">
              Entrar o cambiar filtros no consume búsquedas. La caché de Idealista dura 24 horas; Buscar solicita una actualización confirmada y reutiliza esa caché mientras siga vigente.
            </p>
          </>
        )}

        {source === "favoritos" && <p className="mt-3 text-sm leading-relaxed text-stone-600">Los guardados son copias del anuncio. Si desaparece de Idealista, el favorito permanece hasta que lo quites; no verificamos automáticamente su disponibilidad. Abre el anuncio para comprobarla.</p>}
        {lastSavedAt && <p className="mt-3 text-xs text-stone-600">Última búsqueda guardada en este navegador: {new Date(lastSavedAt).toLocaleString("es-ES")}. Es una instantánea; confirma la disponibilidad en el anuncio.</p>}
        {storageError && <p role="alert" className="mt-2 text-sm text-rose-700">La búsqueda se ha mostrado, pero no ha cabido en el almacenamiento del navegador.</p>}
        {items.length > 0 && <p className="mt-3 text-xs text-stone-600">Orden: HabitIA Score de mayor a menor. La cobertura indica qué parte de tus pesos se puede evaluar. Opportunity y Zone están pendientes de datos verificables.</p>}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
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
            {items.some((item) => item.enrichment?.valuation?.banda != null)
              ? <Legend />
              : items.length > 0 && <p className="text-xs text-stone">Precios de los anuncios · estimación en la ficha</p>}
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
          <div
            role="alert"
            className="mt-6 flex flex-col gap-4 rounded-2xl border border-rose-500/30 bg-rose-50 p-4 text-sm text-ink-700 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-semibold text-ink">No se pudieron cargar las recomendaciones</p>
              <p className="mt-1 leading-relaxed">{recError}</p>
            </div>
            <button
              type="button"
              onClick={() => prepareSearch(applied)}
              className="pressable inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-hairline-strong bg-white px-4 font-semibold text-ink shadow-nudge"
            >
              <ArrowClockwise aria-hidden size={17} weight="bold" />
              Reintentar
            </button>
          </div>
        ) : items.length === 0 ? (
          <EmptyPanel source={source} loading={busy} hasZona={!!displayedFilters.zona.trim()} hasSearched={hasSearched} />
        ) : (
          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
            <div className={cn(mobileView === "list" ? "hidden lg:block" : "block")}>
              <div className="sticky top-20 h-[62dvh] min-h-[480px] overflow-hidden rounded-2xl border border-hairline-strong bg-paper-200 shadow-hairline lg:h-[calc(100dvh-7rem)] lg:max-h-[760px]">
                <MapPanel
                  items={items}
                  work={work}
                  selectedCode={selectedCode}
                  onSelect={setSelectedCode}
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
      {pendingSearch && (
        <SearchConfirmation
          filters={pendingSearch.filters}
          onCancel={() => setPendingSearch(null)}
          onConfirm={confirmSearch}
        />
      )}
      <PropertyDetailDrawer
        item={detailItem}
        isFavorite={detailItem ? favs.isFavorite(detailItem.property.propertyCode) : false}
        onToggleFavorite={() => detailItem && favs.toggleFavorite(detailItem.property)}
        onClose={() => setDetailItem(null)}
      />
    </>
  );
}

function SearchConfirmation({
  filters,
  onCancel,
  onConfirm,
}: {
  filters: FilterForm;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  function cancel() {
    dialogRef.current?.close();
    onCancel();
  }

  return (
    <dialog
      ref={dialogRef}
      onCancel={cancel}
      aria-labelledby="confirm-search-title"
      aria-describedby="confirm-search-description"
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl border border-hairline bg-paper-50 p-6 text-ink shadow-lift backdrop:bg-ink/40"
    >
      <h2 id="confirm-search-title" className="text-xl font-semibold tracking-tight">
        Confirmar búsqueda
      </h2>
      <p className="mt-3 font-medium">
        {filters.operacion === "venta" ? "Comprar" : "Alquilar"} en {filters.zona}
      </p>
      <p className="mt-1 text-sm text-stone-600">
        {filters.precioMax ? `Hasta ${formatEUR(Number(filters.precioMax))}` : "Sin precio máximo"}
        {filters.operacion === "alquiler" && filters.precioMax ? "/mes" : ""}
        {filters.habitaciones ? ` · ${filters.habitaciones} o más habitaciones` : " · Cualquier número de habitaciones"}
      </p>
      <p id="confirm-search-description" className="mt-4 text-sm leading-relaxed text-stone-600">
        Esta búsqueda puede consumir 1 solicitud de tu cupo mensual de Idealista,
        incluso si falla. Si hay resultados guardados vigentes, los reutilizamos
        durante 24 horas sin gastar cuota. En modo demo tampoco se consume cuota.
      </p>
      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <button type="button" onClick={cancel} className="pressable min-h-11 rounded-xl border border-hairline px-4 text-sm font-medium">
          Cancelar
        </button>
        <button type="button" onClick={() => { dialogRef.current?.close(); onConfirm(); }} className="pressable min-h-11 rounded-xl bg-ink px-4 text-sm font-medium text-paper hover:bg-ink-700">
          Confirmar y buscar
        </button>
      </div>
    </dialog>
  );
}

function FilterBar({
  form,
  setForm,
  onApply,
  busy,
  ready,
}: {
  form: FilterForm;
  setForm: (f: FilterForm) => void;
  onApply: () => void;
  busy: boolean;
  ready: boolean;
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
        disabled={busy || !ready || !form.zona.trim()}
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
      <span className="font-medium text-stone-600">Frente a la estimación:</span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full" style={{ background: BANDA_COLOR.barato }} /> Barato
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full" style={{ background: BANDA_COLOR.en_linea }} /> Justo
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full" style={{ background: BANDA_COLOR.muy_caro }} /> Caro
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
  isFavorite,
  onSelect,
  onToggleFavorite,
  onOpenDetail,
}: {
  item: ViewItem;
  selected: boolean;
  isFavorite: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
  onOpenDetail: () => void;
}) {
  const { property, enrichment, rationale, rank } = item;
  const val = enrichment?.valuation ?? null;
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
                {property.sourceKind === "demo" ? "Demo ficticia · " : ""}{property.title}
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
              <Bed aria-hidden size={14} weight="bold" /> {property.rooms == null ? "Habitaciones sin dato" : `${property.rooms} hab.`}
            </span>
            <span className="inline-flex items-center gap-1">
              <Buildings aria-hidden size={14} weight="bold" /> {formatNumber(property.size)} m²
            </span>
          </div>
        </div>
      </div>

      {val?.avisoModelo && <p className="mt-3 text-xs leading-relaxed text-stone-600">{val.nivel === "modelo" && val.operacion === "venta" ? `Oferta 2018 · escenario ${val.nivelPrecios}. Precisión actual no validada.` : val.avisoModelo}</p>}
      {rationale && <p className="mt-3 text-sm leading-relaxed text-ink-700">{rationale}</p>}

      <ScoreBreakdown score={item.score} scoring={item.scoring} />

      {selected && (val || enrichment?.neighborhood?.resumen) && (
        <div className="mt-3 space-y-1.5 border-t border-hairline pt-3 text-sm leading-relaxed text-ink-700">
          {val && (
            <p>
              La vivienda pide <strong className="text-ink">{formatEUR(property.price)}</strong>
              {property.operation === "rent" ? "/mes" : ""}; {priceComparison(val)}.
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
          href={property.sourceKind === "demo" ? undefined : property.url}
          aria-disabled={property.sourceKind === "demo"}
          target="_blank"
          rel="noopener noreferrer"
          className="pressable inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-saffron-700 hover:bg-saffron-50"
        >
          {property.sourceKind === "demo" ? "Anuncio ficticio" : "Ver anuncio"} <ArrowSquareOut aria-hidden size={13} weight="bold" />
        </a>
      </div>
    </article>
  );
}

function EmptyPanel({
  source,
  loading,
  hasZona,
  hasSearched,
}: {
  source: Source;
  loading: boolean;
  hasZona: boolean;
  hasSearched: boolean;
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
      ? !hasSearched
        ? "Revisa los filtros y pulsa Buscar. Solo consultaremos Idealista cuando confirmes la búsqueda."
        : hasZona
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
          : source === "para_ti" && !hasSearched
          ? "Tu búsqueda está por empezar"
          : hasZona
          ? "No hay resultados con estos filtros"
          : "Empieza con una zona"}
      </p>
      <p className="mx-auto mt-2 max-w-[50ch] text-sm leading-relaxed text-stone-600">{copy}</p>
    </div>
  );
}
