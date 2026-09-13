"use client";
import { ArrowUpRight, TrendDown, TrendUp, WarningCircle } from "@phosphor-icons/react";
import { cn, formatEUR, timeAgo } from "@/lib/utils";
import type { RentValuation } from "@/types";

/**
 * ¿Caro o barato? Compara el €/m²/mes del anuncio con la referencia de la zona.
 * El dato de referencia es orientativo y se marca como tal.
 */
export function RentValuationCard({ data }: { data: RentValuation }) {
  const diff = data.diferenciaPorcentual;
  const tone =
    data.banda === "barato" || data.banda === "ajustado"
      ? "good"
      : data.banda === "en_linea"
      ? "fair"
      : "high";

  const numClass =
    tone === "good" ? "text-sage-500" : tone === "high" ? "text-rose-500" : "text-saffron-700";
  const Icon = diff != null && diff < 0 ? TrendDown : TrendUp;

  return (
    <article className="grainy-blob relative overflow-hidden rounded-xl border border-hairline bg-paper-50 p-6 animate-fade-up md:p-8">
      <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-hairline pb-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-saffron-700">
          ¿Caro o barato? · {data.zona.consultada}
        </p>
        <span className="inline-flex items-center gap-1.5 rounded-md border border-hairline-strong/60 bg-paper-100 px-2 py-0.5 text-stone">
          <WarningCircle size={11} weight="bold" />
          <span className="font-mono text-[9px] uppercase tracking-[0.16em]">
            referencia orientativa
          </span>
        </span>
      </header>

      <div className="grid grid-cols-1 gap-6 pt-5 sm:grid-cols-3 md:gap-8">
        {/* Veredicto */}
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-stone">
            vs. media de la zona
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <Icon size={18} weight="bold" className={numClass} />
            <p className={cn("font-display text-3xl font-medium leading-none tabular", numClass)}>
              {diff == null ? "—" : `${diff > 0 ? "+" : ""}${diff.toFixed(1)}%`}
            </p>
          </div>
          <p className="mt-2 text-sm leading-snug text-ink-700">
            {data.valoracion ?? "no hay referencia para esta zona"}
          </p>
        </div>

        {/* €/m²/mes */}
        <div className="sm:border-l sm:border-hairline sm:pl-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-stone">
            Precio del anuncio
          </p>
          <p className="mt-2 font-display text-3xl font-medium leading-none tabular text-ink">
            {data.eurM2Mes.toFixed(1)}
            <span className="ml-1 font-mono text-xs text-stone">€/m²/mes</span>
          </p>
          <p className="mt-2 font-mono text-[11px] tabular text-stone">
            {formatEUR(data.precioMes)}/mes
            {data.referenciaEurM2Mes != null && (
              <> · ref. {data.referenciaEurM2Mes.toFixed(1)} €/m²/mes</>
            )}
          </p>
        </div>

        {/* Rango zona */}
        <div className="sm:border-l sm:border-hairline sm:pl-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-stone">
            Rango típico de la zona
          </p>
          <p className="mt-2 font-display text-3xl font-medium leading-none tabular text-ink">
            {data.rangoZona
              ? `${data.rangoZona.min}–${data.rangoZona.max}`
              : "—"}
            {data.rangoZona && <span className="ml-1 font-mono text-xs text-stone">€/m²/mes</span>}
          </p>
          {data.zona.referencia && (
            <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.14em] text-stone">
              {data.nivel === "provincia" ? "media provincial" : "media del barrio"}
            </p>
          )}
        </div>
      </div>

      <footer className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-hairline pt-4">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-mist">
          {data.zona.referencia ? `Referencia: ${data.zona.referencia}` : "Sin referencia de zona"}
        </span>
        <span className="inline-flex items-center gap-1 font-mono text-[10px] tabular text-stone">
          <span className="truncate max-w-[18rem]">{data.fuente}</span>
          <ArrowUpRight size={11} weight="bold" className="shrink-0 text-mist" />
          <span className="ml-1">
            {data.actualizado ? `cache ${timeAgo(data.actualizado)}` : "respaldo local"}
          </span>
        </span>
      </footer>
    </article>
  );
}
