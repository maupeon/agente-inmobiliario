"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowSquareOut, Heart, MagnifyingGlass } from "@phosphor-icons/react";
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
  const { profile, loaded, save } = useProfile();
  const favs = useFavorites();

  const [skipped, setSkipped] = useState(false);
  const [lastSearch, setLastSearch] = useState<Property[]>([]);
  const [source, setSource] = useState<Source>("para_ti");
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<ViewItem | null>(null);
  const [showSafety, setShowSafety] = useState(true);
  const [showTrajectory, setShowTrajectory] = useState(true);

  // "Para ti"
  const [recs, setRecs] = useState<PropertyRecommendation[]>([]);
  const [recIntro, setRecIntro] = useState<string | null>(null);
  const [recLoading, setRecLoading] = useState(false);
  const [recError, setRecError] = useState<string | null>(null);
  const [form, setForm] = useState<FilterForm>({
    zona: "",
    operacion: "alquiler",
    precioMax: "",
    habitaciones: "",
  });
  const [applied, setApplied] = useState<FilterForm>(form);

  // Enriquecimiento para favoritos / búsqueda
  const [enrichCache, setEnrichCache] = useState<{ key: string; map: Record<string, PropertyEnrichment> }>(
    { key: "", map: {} }
  );
  const [enriching, setEnriching] = useState(false);

  useEffect(() => {
    setLastSearch(readLastSearch().properties);
  }, []);

  // Inicializa filtros desde el perfil una sola vez.
  const initRef = useRef(false);
  useEffect(() => {
    if (initRef.current || !profile) return;
    initRef.current = true;
    const f: FilterForm = {
      zona: profile.zona ?? "",
      operacion: profile.operacion ?? "alquiler",
      precioMax: profile.presupuestoMax ? String(profile.presupuestoMax) : "",
      habitaciones: profile.habitaciones ? String(profile.habitaciones) : "",
    };
    setForm(f);
    setApplied(f);
  }, [profile]);

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
    if (source !== "para_ti") return;
    const zona = applied.zona.trim();
    if (!zona) {
      setRecs([]);
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
        setRecs(d.items ?? []);
        setRecIntro(d.intro ?? null);
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setRecError("No he podido cargar recomendaciones.");
      })
      .finally(() => setRecLoading(false));
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
    if (source === "para_ti") return;
    const base = enrichCache.key === enrichProfileKey ? enrichCache.map : {};
    const missing = enrichList.filter((p) => !base[p.propertyCode]).slice(0, 24);
    if (missing.length === 0) {
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
        const add: Record<string, PropertyEnrichment> = {};
        for (const e of data.enrichments ?? []) add[e.propertyCode] = e;
        setEnrichCache((prev) => {
          const baseMap = prev.key === enrichProfileKey ? prev.map : {};
          return { key: enrichProfileKey, map: { ...baseMap, ...add } };
        });
      })
      .catch(() => {})
      .finally(() => setEnriching(false));
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
    document
      .getElementById(`card-${selectedCode}`)
      ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedCode]);

  // ── Onboarding como puerta de entrada ──
  if (loaded && !profile && !skipped) {
    return (
      <>
        <SiteNav />
        <div className="relative z-10 mx-auto w-full max-w-[760px] px-5 pb-16 pt-10 sm:px-8">
          <Onboarding
            initial={null}
            onComplete={(p) => save(p)}
            onSkip={() => setSkipped(true)}
          />
        </div>
      </>
    );
  }

  const counts = {
    para_ti: recs.length,
    favoritos: favs.favorites.length,
    busqueda: lastSearch.length,
  };
  const busy = source === "para_ti" ? recLoading : enriching;
  const greeting = profile?.name ? `Para ti, ${profile.name}` : "Para ti";
  const plottableCount = items.filter(
    (it) => it.property.latitude != null && it.property.longitude != null
  ).length;

  return (
    <>
      <SiteNav />
      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-[1400px] flex-col px-5 pb-16 pt-8 sm:px-8 lg:px-12">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="font-display text-display-md text-ink">{greeting}</h1>
          <p className="mt-2 max-w-[54ch] text-sm text-stone-600">
            {source === "para_ti"
              ? "Los pisos que mejor encajan con lo que me has contado, sobre el mapa: precio frente a la zona, seguridad del barrio y trayecto a tu trabajo."
              : "Tus pisos sobre el mapa, con precio frente a la zona, seguridad del barrio y trayecto a tu trabajo."}{" "}
            <span className="text-mist">Datos de barrio y precio orientativos.</span>
          </p>
        </div>

        <div className="flex gap-2">
          {(["para_ti", "favoritos", "busqueda"] as Source[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setSource(s);
                setSelectedCode(null);
              }}
              className={cn(
                "rounded-lg border px-3.5 py-2 text-sm transition active:scale-[0.98]",
                source === s
                  ? "border-ink bg-ink text-paper"
                  : "border-hairline bg-paper-50 text-ink-700 hover:border-ink/30"
              )}
            >
              {s === "para_ti" ? "Para ti" : s === "favoritos" ? "Favoritos" : "Búsqueda"}
              <span
                className={cn(
                  "ml-1.5 font-mono text-[10px]",
                  source === s ? "text-paper/60" : "text-mist"
                )}
              >
                {counts[s]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Controles de búsqueda (solo "Para ti") */}
      {source === "para_ti" && (
        <FilterBar
          form={form}
          setForm={setForm}
          onApply={() => setApplied(form)}
          busy={recLoading}
        />
      )}

      {/* Toggles + leyenda */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-hairline pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <Toggle on={showSafety} onClick={() => setShowSafety((v) => !v)}>
            Seguridad
          </Toggle>
          <Toggle on={showTrajectory} onClick={() => setShowTrajectory((v) => !v)}>
            Trayecto
          </Toggle>
          {busy && (
            <span className="ml-1 animate-pulse-soft font-mono text-[10px] uppercase tracking-[0.18em] text-stone">
              {source === "para_ti" ? "buscando para ti…" : "calculando…"}
            </span>
          )}
        </div>
        <Legend />
      </div>

      {!work && (
        <p className="mt-4 rounded-lg border border-saffron-200 bg-saffron-50 px-4 py-3 text-sm text-ink-700">
          Añade tu lugar de trabajo{" "}
          {profile ? (
            <Link href="/chat" className="underline decoration-saffron-300 underline-offset-2">
              (Editar perfil en el chat)
            </Link>
          ) : (
            "en el onboarding"
          )}{" "}
          para ver el tiempo y el trayecto hasta cada piso.
        </p>
      )}

      {source === "para_ti" && recIntro && items.length > 0 && (
        <p className="mt-4 border-l-2 border-saffron-300 bg-paper-50 px-4 py-3 font-display text-lg italic leading-snug text-ink-700">
          {recIntro}
        </p>
      )}

      {/* Cuerpo */}
      {recError && source === "para_ti" ? (
        <p className="mt-6 rounded-lg border border-rose-500/30 bg-rose-50 p-4 text-sm text-ink-700">
          {recError}
        </p>
      ) : items.length === 0 ? (
        <EmptyPanel source={source} loading={busy} hasZona={!!applied.zona.trim()} />
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <div className="sticky top-6 h-[52vh] overflow-hidden rounded-xl border border-hairline-strong lg:h-[680px]">
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

          <div className="space-y-3 lg:col-span-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-stone">
              {plottableCount} de {items.length} en el mapa
            </p>
            {items.map((it) => (
              <PropertyRow
                key={it.property.propertyCode}
                item={it}
                selected={it.property.propertyCode === selectedCode}
                hasWork={!!work}
                isFavorite={favs.isFavorite(it.property.propertyCode)}
                onSelect={() =>
                  setSelectedCode(
                    selectedCode === it.property.propertyCode ? null : it.property.propertyCode
                  )
                }
                onToggleFavorite={() => favs.toggleFavorite(it.property)}
                onOpenDetail={() => setDetailItem(it)}
              />
            ))}
          </div>
        </div>
      )}

      <PropertyDetailDrawer
        item={detailItem}
        isFavorite={detailItem ? favs.isFavorite(detailItem.property.propertyCode) : false}
        onToggleFavorite={() => detailItem && favs.toggleFavorite(detailItem.property)}
        onClose={() => setDetailItem(null)}
      />
      </div>
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
      onSubmit={(e) => {
        e.preventDefault();
        onApply();
      }}
      className="mt-6 flex flex-wrap items-end gap-3 rounded-xl border border-hairline bg-paper-50 p-4"
    >
      <Field label="Zona o ciudad">
        <input
          value={form.zona}
          onChange={(e) => setForm({ ...form, zona: e.target.value })}
          placeholder="Malasaña, Madrid"
          className={inputCls}
        />
      </Field>
      <Field label="Operación">
        <div className="flex gap-1.5">
          {(["alquiler", "venta"] as const).map((op) => (
            <button
              key={op}
              type="button"
              onClick={() => setForm({ ...form, operacion: op })}
              className={cn(
                "rounded-md border px-3 py-2 text-sm capitalize transition",
                form.operacion === op
                  ? "border-ink bg-ink text-paper"
                  : "border-hairline bg-paper text-ink-700 hover:border-ink/30"
              )}
            >
              {op === "alquiler" ? "Alquilar" : "Comprar"}
            </button>
          ))}
        </div>
      </Field>
      <Field label={`Precio máx. (${form.operacion === "venta" ? "€" : "€/mes"})`}>
        <input
          inputMode="numeric"
          value={form.precioMax}
          onChange={(e) =>
            setForm({ ...form, precioMax: e.target.value.replace(/[^\d]/g, "") })
          }
          placeholder={form.operacion === "venta" ? "320000" : "1400"}
          className={cn(inputCls, "w-32")}
        />
      </Field>
      <Field label="Hab.">
        <select
          value={form.habitaciones}
          onChange={(e) => setForm({ ...form, habitaciones: e.target.value })}
          className={cn(inputCls, "w-20")}
        >
          <option value="">—</option>
          {["1", "2", "3", "4"].map((n) => (
            <option key={n} value={n}>
              {n}
              {n === "4" ? "+" : ""}
            </option>
          ))}
        </select>
      </Field>
      <button
        type="submit"
        disabled={busy || !form.zona.trim()}
        className="inline-flex items-center gap-2 rounded-md bg-ink px-5 py-2.5 text-sm text-paper transition hover:bg-ink-700 active:scale-[0.98] disabled:opacity-50"
      >
        <MagnifyingGlass size={14} weight="bold" className="text-saffron-300" />
        Buscar para mí
      </button>
    </form>
  );
}

const inputCls =
  "rounded-lg border border-hairline bg-paper px-3 py-2 text-sm text-ink placeholder:text-mist transition focus:border-ink/40 focus:outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[9px] uppercase tracking-[0.16em] text-stone">
        {label}
      </span>
      {children}
    </label>
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
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] transition",
        on
          ? "border-ink bg-ink text-paper"
          : "border-hairline bg-paper-50 text-stone hover:border-ink/30"
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", on ? "bg-saffron-300" : "bg-mist")} />
      {children}
    </button>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[9px] uppercase tracking-[0.14em] text-stone">
      <div className="flex items-center gap-1.5">
        <span className="text-mist">Precio</span>
        {(["barato", "en_linea", "muy_caro"] as const).map((b) => (
          <span key={b} className="h-2.5 w-2.5 rounded-full" style={{ background: BANDA_COLOR[b] }} />
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-mist">Barrio</span>
        {[80, 67, 50].map((v) => (
          <span
            key={v}
            className="h-2.5 w-2.5 rounded-full opacity-60"
            style={{ background: safetyColor(v) }}
          />
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-mist">Trayecto</span>
        <span className="inline-block h-0.5 w-6" style={{ background: "#7A5610" }} />
      </div>
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
    <div
      id={`card-${property.propertyCode}`}
      className={cn(
        "rounded-xl border bg-paper-50 p-4 transition",
        selected ? "border-ink shadow-lift" : "border-hairline hover:border-ink/25"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <button type="button" onClick={onSelect} className="min-w-0 flex-1 text-left">
          <p className="line-clamp-1 font-display text-base leading-tight text-ink">
            {rank ? <span className="text-saffron-700">{rank}. </span> : null}
            {property.title}
          </p>
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-stone">
            {[property.district, property.municipality].filter(Boolean).join(" · ") || "Sin zona"}
            {noCoords && " · sin ubicación"}
          </p>
        </button>
        <button
          type="button"
          onClick={onToggleFavorite}
          aria-label={isFavorite ? "Quitar de favoritos" : "Guardar en favoritos"}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-hairline text-stone transition hover:border-ink/30 hover:text-ink"
        >
          <Heart size={14} weight={isFavorite ? "fill" : "regular"} className={isFavorite ? "text-clay-500" : ""} />
        </button>
      </div>

      {rationale && (
        <p className="mt-2 text-sm leading-snug text-ink-700">{rationale}</p>
      )}

      <div className="mt-2 flex items-baseline gap-2">
        <span className="font-mono text-lg text-ink">{formatEUR(property.price)}</span>
        {property.operation === "rent" && (
          <span className="font-mono text-[11px] text-stone">/mes</span>
        )}
        {property.pricePerSqm && (
          <span className="ml-auto font-mono text-[11px] text-stone">
            {eurM2Label(property.pricePerSqm, op)}
          </span>
        )}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-hairline pt-3">
        <Signal label="Precio">
          <PriceBadge val={val} />
        </Signal>
        <Signal label="Trayecto">
          {!hasWork ? (
            <span className="text-stone">—</span>
          ) : leg?.minutos != null ? (
            <span className="text-ink">
              {leg.minutos}′{" "}
              <span className="text-stone">
                {commute?.recomendado ? MODE_LABEL[commute.recomendado] : ""}
              </span>
            </span>
          ) : (
            <span className="text-stone">—</span>
          )}
        </Signal>
        <Signal label="Barrio">
          {safety?.indice != null ? (
            <span className="inline-flex items-center gap-1.5 text-ink">
              <span className="h-2 w-2 rounded-full" style={{ background: safetyColor(safety.indice) }} />
              {safety.indice}/100
            </span>
          ) : (
            <span className="text-stone">—</span>
          )}
        </Signal>
      </div>

      {selected && (
        <div className="mt-3 space-y-1.5 border-t border-hairline pt-3 text-sm text-ink-700">
          {val && (
            <p>
              Pide <strong className="text-ink">{formatEUR(property.price)}</strong>
              {property.operation === "rent" ? "/mes" : ""} — {val.etiqueta ?? "sin referencia de zona"}
              {val.referenciaEurM2 != null && (
                <span className="text-stone"> (zona ≈ {eurM2Label(val.referenciaEurM2, val.operacion)})</span>
              )}
              .
            </p>
          )}
          {enrichment?.neighborhood?.resumen && (
            <p className="text-stone-600">{enrichment.neighborhood.resumen}</p>
          )}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={onOpenDetail}
              className="inline-flex items-center gap-1.5 rounded-md bg-ink px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-paper transition hover:bg-ink-700"
            >
              Ver ficha completa
            </button>
            <a
              href={property.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-saffron-700 transition hover:text-ink"
            >
              Ver en Idealista <ArrowSquareOut size={11} weight="bold" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function Signal({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-mist">{label}</p>
      <p className="mt-1 text-sm">{children}</p>
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
      <div className="mt-10 grid place-items-center rounded-xl border border-dashed border-hairline-strong bg-paper-50 p-12 font-mono text-[10px] uppercase tracking-[0.2em] text-stone">
        Buscando los mejores pisos para ti…
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
      : "Aún no has hecho ninguna búsqueda en el chat.";

  return (
    <div className="mt-10 rounded-xl border border-dashed border-hairline-strong bg-paper-50 p-10 text-center">
      <p className="font-display text-2xl text-ink">Nada que mapear todavía</p>
      <p className="mx-auto mt-2 max-w-[46ch] text-sm text-stone-600">{copy}</p>
    </div>
  );
}
