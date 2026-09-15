"use client";
import {
  Bicycle,
  Bus,
  Car,
  MapPin,
  PersonSimpleWalk,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { CommuteLeg, CommuteMode, CommuteResult } from "@/types";

const MODE_META: Record<
  CommuteMode,
  { label: string; Icon: typeof Bus }
> = {
  a_pie: { label: "A pie", Icon: PersonSimpleWalk },
  bici: { label: "En bici", Icon: Bicycle },
  transporte: { label: "Transporte", Icon: Bus },
  coche: { label: "En coche", Icon: Car },
};

/** Trayecto vivienda → trabajo por cada modo. Resalta el recomendado. */
export function CommuteCard({ data }: { data: CommuteResult }) {
  return (
    <article className="grainy-blob relative overflow-hidden rounded-xl border border-hairline bg-paper-50 p-6 animate-fade-up md:p-8">
      <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-hairline pb-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-saffron-700">
          Trayecto al trabajo
        </p>
        <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-stone">
          {data.proveedor === "openrouteservice"
            ? "rutas en vivo · OpenRouteService"
            : "tiempos estimados"}
        </span>
      </header>

      <div className="flex items-center gap-2 pt-4 text-sm text-ink-700">
        <MapPin size={14} weight="bold" className="shrink-0 text-stone" />
        <span className="truncate">
          {data.origen?.direccion ?? "tu vivienda"}
        </span>
        <span className="text-mist">→</span>
        <span className="truncate font-medium text-ink">{data.destino.etiqueta}</span>
        {data.distanciaLineaKm != null && (
          <span className="ml-auto shrink-0 font-mono text-[11px] tabular text-stone">
            {data.distanciaLineaKm} km en línea recta
          </span>
        )}
      </div>

      <ul className="mt-5 grid gap-2 sm:grid-cols-2">
        {data.modos.map((leg) => (
          <LegRow key={leg.modo} leg={leg} recomendado={leg.modo === data.recomendado} />
        ))}
      </ul>

      {data.nota && (
        <p className="mt-4 border-t border-hairline pt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-mist">
          {data.nota}
        </p>
      )}
    </article>
  );
}

function LegRow({ leg, recomendado }: { leg: CommuteLeg; recomendado: boolean }) {
  const { label, Icon } = MODE_META[leg.modo];
  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded-lg border px-4 py-3 transition",
        recomendado
          ? "border-ink/30 bg-paper-100"
          : "border-hairline bg-paper-50"
      )}
    >
      <Icon
        size={18}
        weight="bold"
        className={recomendado ? "text-saffron-700" : "text-stone"}
      />
      <div className="min-w-0">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-stone">
          {label}
          {recomendado && <span className="ml-1.5 text-saffron-700">· recomendado</span>}
        </p>
        <p className="font-display text-xl leading-tight tabular text-ink">
          {leg.minutos != null ? `${leg.minutos} min` : "—"}
          {leg.distanciaKm != null && (
            <span className="ml-1.5 font-mono text-[11px] text-stone">
              {leg.distanciaKm} km
            </span>
          )}
        </p>
      </div>
    </li>
  );
}
