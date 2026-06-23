/* eslint-disable @next/next/no-img-element */
"use client";
import { useEffect, useState } from "react";
import { ArrowSquareOut, Heart, X } from "@phosphor-icons/react";
import { bandaColor, formatDiff } from "@/lib/dashboard-format";
import { cn, formatEUR, formatNumber } from "@/lib/utils";
import type { Property, PropertyDetail, PropertyEnrichment } from "@/types";
import { CommuteCard } from "./CommuteCard";
import { NeighborhoodCard } from "./NeighborhoodCard";

export interface DetailItem {
  property: Property;
  enrichment: PropertyEnrichment | null;
}

export function PropertyDetailDrawer({
  item,
  isFavorite,
  onToggleFavorite,
  onClose,
}: {
  item: DetailItem | null;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<PropertyDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const code = item?.property.propertyCode ?? null;

  useEffect(() => {
    if (!code) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetail(null);
    setLoading(true);
    fetch(`/api/property?code=${encodeURIComponent(code)}`)
      .then((r) => (r.ok ? r.json() : { detail: null }))
      .then((d: { detail: PropertyDetail | null }) => {
        if (!cancelled) setDetail(d.detail);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!item) return null;
  const p = item.property;
  const e = item.enrichment;
  const val = e?.valuation ?? null;
  const op: "alquiler" | "venta" = p.operation === "rent" ? "alquiler" : "venta";
  const photos = detail?.photos?.length ? detail.photos : p.thumbnail ? [p.thumbnail] : [];

  return (
    <>
      <button
        type="button"
        aria-label="Cerrar ficha"
        onClick={onClose}
        className="fixed inset-0 z-40 animate-fade-in bg-ink/40 backdrop-blur-sm"
      />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[640px] flex-col bg-paper shadow-lift">
        <header className="flex items-center justify-between gap-3 border-b border-hairline px-5 py-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-stone">
            Ficha completa
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleFavorite}
              aria-label={isFavorite ? "Quitar de favoritos" : "Guardar en favoritos"}
              className="grid h-8 w-8 place-items-center rounded-md border border-hairline text-stone transition hover:border-ink/30 hover:text-ink"
            >
              <Heart size={14} weight={isFavorite ? "fill" : "regular"} className={isFavorite ? "text-clay-500" : ""} />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="grid h-8 w-8 place-items-center rounded-md border border-hairline text-stone transition hover:border-ink/30 hover:text-ink"
            >
              <X size={14} weight="bold" />
            </button>
          </div>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          {photos.length > 0 && (
            <div className="grid grid-cols-2 gap-1.5">
              {photos.slice(0, 4).map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt={p.title}
                  loading="lazy"
                  className={cn(
                    "w-full rounded-lg object-cover",
                    i === 0 ? "col-span-2 h-56" : "h-36"
                  )}
                />
              ))}
            </div>
          )}

          <div>
            <h2 className="font-display text-2xl leading-tight text-ink">{p.title}</h2>
            <p className="mt-1 text-sm text-stone">
              {[p.address, p.district, p.municipality].filter(Boolean).join(" · ")}
            </p>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-mono text-2xl text-ink">{formatEUR(p.price)}</span>
              {p.operation === "rent" && <span className="text-stone">/mes</span>}
              {p.pricePerSqm && (
                <span className="ml-auto font-mono text-xs text-stone">
                  {op === "alquiler"
                    ? `${p.pricePerSqm} €/m²·mes`
                    : `${formatNumber(p.pricePerSqm)} €/m²`}
                </span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-stone">
              <span>{p.rooms} hab.</span>
              <span>{p.size} m²</span>
              {p.bathrooms && <span>{p.bathrooms} baños</span>}
              {detail?.yearBuilt && <span>año {detail.yearBuilt}</span>}
              {detail?.energyCertification && <span>energía {detail.energyCertification}</span>}
            </div>
            {detail?.features && detail.features.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {detail.features.map((f) => (
                  <span
                    key={f}
                    className="rounded-md border border-hairline bg-paper-50 px-2 py-1 text-[11px] text-ink-700"
                  >
                    {f}
                  </span>
                ))}
              </div>
            )}
            {detail?.description && (
              <p className="mt-3 text-sm leading-relaxed text-stone-600">{detail.description}</p>
            )}
            <a
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-saffron-700 transition hover:text-ink"
            >
              Ver en Idealista <ArrowSquareOut size={11} weight="bold" />
            </a>
          </div>

          {val && (
            <section className="rounded-xl border border-hairline bg-paper-50 p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-saffron-700">
                Precio frente a la zona
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-display text-3xl" style={{ color: bandaColor(val.banda) }}>
                  {formatDiff(val.diferenciaPorcentual)}
                </span>
                {val.etiqueta && <span className="text-sm text-ink-700">{val.etiqueta}</span>}
              </div>
              {val.referenciaEurM2 != null && (
                <p className="mt-1 font-mono text-[11px] text-stone">
                  Anuncio{" "}
                  {op === "alquiler"
                    ? `${val.eurM2} €/m²·mes`
                    : `${formatNumber(Math.round(val.eurM2))} €/m²`}{" "}
                  · zona ≈{" "}
                  {op === "alquiler"
                    ? `${val.referenciaEurM2} €/m²·mes`
                    : `${formatNumber(Math.round(val.referenciaEurM2))} €/m²`}
                </p>
              )}
              <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.16em] text-mist">
                Referencia orientativa{val.fromFallback ? " · respaldo local" : ""}
              </p>
            </section>
          )}

          {p.operation === "sale" && <MortgageMini price={p.price} />}

          {e?.commute && <CommuteCard data={e.commute} />}
          {e?.neighborhood && <NeighborhoodCard data={e.neighborhood} />}

          {loading && (
            <p className="text-center font-mono text-[10px] uppercase tracking-[0.2em] text-stone">
              Cargando ficha…
            </p>
          )}
        </div>
      </aside>
    </>
  );
}

/** Hipoteca orientativa con supuestos estándar (20% entrada, 30 años, 3,5%). */
function MortgageMini({ price }: { price: number }) {
  const entrada = 0.2;
  const years = 30;
  const rate = 0.035;
  const loan = price * (1 - entrada);
  const r = rate / 12;
  const n = years * 12;
  const cuota = Math.round((loan * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
  return (
    <section className="rounded-xl border border-hairline bg-paper-50 p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-saffron-700">
        Hipoteca estimada
      </p>
      <p className="mt-2 font-display text-3xl text-ink">
        {formatEUR(cuota)}
        <span className="ml-1 font-mono text-sm text-stone">/mes</span>
      </p>
      <p className="mt-1 font-mono text-[11px] text-stone">
        20% de entrada · 30 años · 3,5% TIN (orientativo)
      </p>
    </section>
  );
}
