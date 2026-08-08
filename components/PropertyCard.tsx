"use client";
import {
  ArrowUpRight,
  Heart,
  Resize,
  Bed,
  Buildings,
  Sparkle,
} from "@phosphor-icons/react";
import { cn, formatEUR, formatNumber } from "@/lib/utils";
import type { Property } from "@/types";

interface PropertyCardProps {
  property: Property;
  variant?: "feature" | "compact";
  isFavorite?: boolean;
  onToggleFavorite?: (p: Property) => void;
  index?: number;
}

/**
 * Variante "feature": foto a sangre, precio en serif editorial, signature
 * grainy blob detrás del bloque de texto. Variante "compact": dossier
 * paper con foto a la izquierda y datos a la derecha.
 */
export function PropertyCard({
  property,
  variant = "compact",
  isFavorite = false,
  onToggleFavorite,
  index = 0,
}: PropertyCardProps) {
  const isRent = property.operation === "rent";
  const priceLabel = formatEUR(property.price);
  const sqmLabel = property.size ? `${formatNumber(property.size)} m²` : null;
  const ppsmUnit = isRent ? "€/m²·mes" : "€/m²";
  const ppsmLabel = property.pricePerSqm
    ? `${formatNumber(property.pricePerSqm)} ${ppsmUnit}`
    : property.size
    ? `${formatNumber(Math.round(property.price / property.size))} ${ppsmUnit}`
    : null;

  if (variant === "feature") {
    return (
      <article
        className="group relative isolate flex flex-col overflow-hidden rounded-xl border border-hairline bg-paper-50 transition hover:shadow-lift"
        style={{ animationDelay: `${index * 60}ms` }}
      >
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-paper-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={property.thumbnail}
            alt={property.title}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
            className="h-full w-full object-cover transition-transform duration-700 ease-editorial group-hover:scale-[1.02]"
          />

          <button
            type="button"
            onClick={() => onToggleFavorite?.(property)}
            aria-pressed={isFavorite}
            aria-label={isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"}
            className={cn(
              "absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-md border bg-paper/90 backdrop-blur-sm transition active:scale-95",
              isFavorite
                ? "border-saffron-200 text-saffron-700"
                : "border-hairline text-stone hover:text-saffron-700"
            )}
          >
            <Heart size={15} weight={isFavorite ? "fill" : "regular"} />
          </button>
        </div>

        {/* Bloque de texto sobre paper con grainy blob detrás */}
        <div className="grainy-blob relative px-6 py-6 sm:px-8 sm:py-7">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-mono text-[10px] uppercase tracking-[0.18em] text-stone">
                {property.district ?? property.municipality}
                {property.municipality && property.district
                  ? ` · ${property.municipality}`
                  : ""}
              </p>
              <h3 className="mt-2 text-balance font-display text-xl leading-tight text-ink sm:text-2xl">
                {property.title}
              </h3>
              <p className="mt-3 break-words font-display text-3xl font-medium leading-none text-ink tabular sm:text-4xl">
                {priceLabel}
                {isRent && (
                  <span className="ml-1 align-baseline font-mono text-xs text-stone">
                    /mes
                  </span>
                )}
              </p>
            </div>
            <a
              href={property.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-1 rounded-md border border-ink bg-ink px-3.5 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-paper transition hover:bg-ink-700 active:scale-[0.98]"
            >
              Ver anuncio <ArrowUpRight size={11} weight="bold" />
            </a>
          </div>

          <div className="mt-5 flex flex-wrap items-end gap-x-7 gap-y-3 border-t border-hairline pt-4">
            <PropertyMetric
              icon={<Bed size={13} weight="bold" />}
              label="hab."
              value={String(property.rooms)}
            />
            {sqmLabel && (
              <PropertyMetric
                icon={<Resize size={13} weight="bold" />}
                label="superficie"
                value={sqmLabel}
              />
            )}
            {property.floor && (
              <PropertyMetric
                icon={<Buildings size={13} weight="bold" />}
                label="planta"
                value={property.floor}
              />
            )}
            {ppsmLabel && (
              <PropertyMetric
                icon={<Sparkle size={13} weight="bold" />}
                label={isRent ? "precio/m²·mes" : "precio/m²"}
                value={ppsmLabel}
                accent
              />
            )}
          </div>
        </div>
      </article>
    );
  }

  // compact
  return (
    <article
      className="group flex flex-col gap-4 overflow-hidden rounded-lg border border-hairline bg-paper-50 p-4 transition hover:shadow-lift sm:flex-row sm:gap-4"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded bg-paper-200 sm:aspect-square sm:w-32">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={property.thumbnail}
          alt={property.title}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
          className="h-full w-full object-cover transition-transform duration-700 ease-editorial group-hover:scale-[1.04]"
        />
        <button
          type="button"
          onClick={() => onToggleFavorite?.(property)}
          aria-pressed={isFavorite}
          aria-label={isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"}
          className={cn(
            "absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-md border bg-paper/90 backdrop-blur-sm transition active:scale-95",
            isFavorite
              ? "border-saffron-200 text-saffron-700"
              : "border-hairline text-stone hover:text-saffron-700"
          )}
        >
          <Heart size={12} weight={isFavorite ? "fill" : "regular"} />
        </button>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <p className="truncate font-mono text-[10px] uppercase tracking-[0.18em] text-stone">
          {property.district ?? property.municipality}
          {property.municipality && property.district ? ` · ${property.municipality}` : ""}
        </p>

        <h3 className="mt-1.5 line-clamp-2 break-words font-display text-lg leading-tight text-ink">
          {property.title}
        </h3>

        <div className="mt-auto flex flex-wrap items-baseline gap-x-3 gap-y-1 pt-3">
          <p className="break-words font-display text-xl font-medium leading-none text-ink tabular">
            {priceLabel}
            {isRent && (
              <span className="ml-1 align-baseline font-mono text-[11px] text-stone">/mes</span>
            )}
          </p>
          {ppsmLabel && (
            <span className="font-mono text-[11px] tabular text-stone">{ppsmLabel}</span>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-hairline pt-3 text-xs text-stone">
          <span className="inline-flex items-center gap-1">
            <Bed size={12} weight="bold" />
            <span className="tabular">{property.rooms} hab.</span>
          </span>
          {sqmLabel && (
            <span className="inline-flex items-center gap-1">
              <Resize size={12} weight="bold" />
              <span className="tabular">{sqmLabel}</span>
            </span>
          )}
          {property.floor && (
            <span className="inline-flex items-center gap-1">
              <Buildings size={12} weight="bold" />
              <span className="truncate max-w-[80px]">{property.floor}</span>
            </span>
          )}
          {property.hasLift && <Tag>Ascensor</Tag>}
          {property.exterior && <Tag>Exterior</Tag>}
        </div>

        <a
          href={property.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex w-fit max-w-full items-center gap-1 truncate font-mono text-[10px] uppercase tracking-[0.16em] text-saffron-700 transition hover:text-saffron-500"
        >
          Ver en Idealista <ArrowUpRight size={11} weight="bold" />
        </a>
      </div>
    </article>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-hairline bg-paper px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-stone-600">
      {children}
    </span>
  );
}

function PropertyMetric({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col">
      <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.18em] text-stone">
        <span className={accent ? "text-saffron-700" : "text-stone"}>{icon}</span>
        {label}
      </span>
      <span
        className={cn(
          "tabular text-sm",
          accent ? "text-saffron-700" : "text-ink"
        )}
      >
        {value}
      </span>
    </div>
  );
}
