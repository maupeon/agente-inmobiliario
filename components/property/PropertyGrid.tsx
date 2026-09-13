"use client";
import type { Property } from "@/types";
import { PropertyCard } from "./PropertyCard";
import { cn } from "@/lib/utils";

/**
 * Bento asimétrico tipo spread editorial. La primera propiedad ocupa todo
 * el ancho como "feature". El resto se reparte en bloques de tamaño
 * variable. En móvil, una sola columna en orden de aparición.
 */
export function PropertyGrid({
  items,
  isFavorite,
  onToggleFavorite,
}: {
  items: Property[];
  isFavorite?: (code: string) => boolean;
  onToggleFavorite?: (p: Property) => void;
}) {
  if (items.length === 0) return null;

  const [feature, ...rest] = items;

  return (
    <div className="space-y-4 animate-fade-up">
      <PropertyCard
        property={feature}
        variant="feature"
        isFavorite={isFavorite?.(feature.propertyCode) ?? false}
        onToggleFavorite={onToggleFavorite}
        index={0}
      />

      {rest.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {rest.map((p, i) => (
            <PropertyCard
              key={p.propertyCode}
              property={p}
              variant="compact"
              isFavorite={isFavorite?.(p.propertyCode) ?? false}
              onToggleFavorite={onToggleFavorite}
              index={i + 1}
            />
          ))}
        </div>
      )}

      <p
        className={cn(
          "border-t border-hairline pt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-stone"
        )}
      >
        {items.length} resultado{items.length === 1 ? "" : "s"} para esta búsqueda
        <span className="mx-2 text-mist">·</span>
        verifica la disponibilidad en el anuncio
      </p>
    </div>
  );
}
