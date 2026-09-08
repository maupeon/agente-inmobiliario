"use client";
import { ShieldCheck, WarningCircle } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { NeighborhoodReport, QolIndicator } from "@/types";

/**
 * Seguridad + calidad de vida de un barrio. Datos curados y orientativos
 * (no oficiales en vivo): la tarjeta lo deja claro con la etiqueta.
 */
export function NeighborhoodCard({ data }: { data: NeighborhoodReport }) {
  const seg = data.seguridad;
  const segTone =
    seg.indice == null
      ? "text-stone"
      : seg.indice >= 75
      ? "text-sage-500"
      : seg.indice >= 60
      ? "text-saffron-700"
      : "text-rose-500";

  const nombre = data.zona.encontrada ?? data.zona.consultada;

  return (
    <article className="grainy-blob relative overflow-hidden rounded-xl border border-hairline bg-paper-50 p-6 animate-fade-up md:p-8">
      <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-hairline pb-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-saffron-700">
          Seguridad y calidad de vida · {nombre}
        </p>
        <span
          className="inline-flex items-center gap-1.5 rounded-md border border-hairline-strong/60 bg-paper-100 px-2 py-0.5 text-stone"
          title="Sin indicadores verificados para comparar barrios."
        >
          <WarningCircle size={11} weight="bold" />
          <span className="font-mono text-[9px] uppercase tracking-[0.16em]">
            sin medición verificada
          </span>
        </span>
      </header>

      {seg.indice == null && data.calidadVida.indiceGlobal == null ? (
        <p className="pt-5 text-sm text-ink-700">
          {data.resumen ?? "No hay una fuente verificada disponible para esta zona."}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 pt-5 sm:grid-cols-[auto,1fr] sm:gap-8">
            {/* Seguridad */}
            <div className="sm:pr-8 sm:border-r sm:border-hairline">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-stone">
                Seguridad
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                <ShieldCheck size={20} weight="bold" className={segTone} />
                <p className={cn("font-display text-4xl font-medium leading-none tabular", segTone)}>
                  {seg.indice ?? "—"}
                  <span className="ml-0.5 font-mono text-sm text-stone">/100</span>
                </p>
              </div>
              {seg.etiqueta && (
                <p className="mt-2 max-w-[22ch] text-sm leading-snug text-ink-700">
                  Zona {seg.etiqueta}.
                </p>
              )}
              {seg.tasaCriminalidad != null && (
                <p className="mt-2 font-mono text-[11px] tabular text-stone">
                  ≈ {seg.tasaCriminalidad} infracciones / 1.000 hab. al año
                </p>
              )}
            </div>

            {/* Calidad de vida */}
            <div>
              <div className="flex items-baseline justify-between">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-stone">
                  Calidad de vida
                </p>
                {data.calidadVida.indiceGlobal != null && (
                  <p className="font-display text-xl leading-none tabular text-ink">
                    {data.calidadVida.indiceGlobal}
                    <span className="ml-0.5 font-mono text-xs text-stone">/100</span>
                  </p>
                )}
              </div>
              <div className="mt-3 space-y-2.5">
                {data.calidadVida.indicadores.map((ind) => (
                  <Indicator key={ind.clave} ind={ind} />
                ))}
              </div>
            </div>
          </div>

          {data.resumen && (
            <p className="mt-6 border-t border-hairline pt-4 text-sm leading-relaxed text-ink-700">
              {data.resumen}
            </p>
          )}
        </>
      )}

      <footer className="mt-4 grid gap-1 border-t border-hairline pt-4 font-mono text-[10px] tabular text-mist sm:grid-cols-2">
        <span className="truncate">{data.fuentes.seguridad}</span>
        <span className="truncate sm:text-right">{data.fuentes.calidadVida}</span>
      </footer>
    </article>
  );
}

function Indicator({ ind }: { ind: QolIndicator }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-stone">
        {ind.etiqueta}
      </span>
      <span className="h-1.5 flex-1 rounded-full bg-paper-300">
        <span
          className="block h-full rounded-full bg-saffron-300 transition-all duration-700 ease-editorial"
          style={{ width: `${Math.max(0, Math.min(100, ind.valor))}%` }}
        />
      </span>
      <span className="w-7 shrink-0 text-right font-mono text-[11px] tabular text-ink-700">
        {ind.valor}
      </span>
    </div>
  );
}
