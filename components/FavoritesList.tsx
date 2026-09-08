"use client";
import { Heart, ArrowUpRight } from "@phosphor-icons/react";
import { formatEUR } from "@/lib/utils";
import type { Property } from "@/types";

export function FavoritesList({
  favorites,
  onRemove,
}: {
  favorites: Property[];
  onRemove?: (p: Property) => void;
}) {
  if (favorites.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-hairline px-3 py-4 text-xs text-stone">
        Aún no has guardado ninguna casa. Toca el corazón en cualquier
        ficha para tenerla a mano.
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {favorites.slice(0, 8).map((p) => (
        <li
          key={p.propertyCode}
          className="group relative flex items-start gap-3 rounded-md border border-hairline bg-paper p-2 pr-3 transition hover:border-ink/20"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={p.thumbnail}
            alt=""
            className="h-12 w-12 shrink-0 rounded object-cover"
            loading="lazy"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate font-mono text-[10px] uppercase tracking-[0.14em] text-stone">
              {p.district ?? p.municipality}
            </p>
            <p className="truncate font-display text-sm leading-tight text-ink">
              {formatEUR(p.price, { compact: true })}
              {p.size ? (
                <span className="ml-1 font-mono text-[11px] tabular text-stone">
                  · {p.size} m²
                </span>
              ) : null}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <a
                href={p.sourceKind === "demo" ? undefined : p.url}
                aria-disabled={p.sourceKind === "demo"}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-saffron-700 hover:text-saffron-500"
              >
                {p.sourceKind === "demo" ? "Anuncio ficticio" : "Anuncio"} <ArrowUpRight size={9} weight="bold" />
              </a>
              {onRemove && (
                <button
                  type="button"
                  onClick={() => onRemove(p)}
                  className="font-mono text-[9px] uppercase tracking-[0.14em] text-mist hover:text-rose-500"
                >
                  Quitar
                </button>
              )}
            </div>
          </div>
          <Heart size={12} weight="fill" className="mt-0.5 text-saffron-700" />
        </li>
      ))}
    </ul>
  );
}
