"use client";
import { useMemo } from "react";
import { runCompararAlquilerCompra } from "@/lib/finance/rent-vs-buy";
import { formatEUR } from "@/lib/utils";
import type { RentVsBuyInput } from "@/types";

const REVAL = [1, 2, 3, 4, 5, 6]; // columnas: revalorización vivienda
const RENTAB = [9, 8, 7, 6, 5, 4]; // filas (de arriba a abajo): rentabilidad cartera

/**
 * Mapa de sensibilidad: para cada combinación de rentabilidad de la cartera ×
 * revalorización de la vivienda, re-ejecuta el motor y colorea la celda según
 * quién gana y por cuánto. Comunica con honestidad que el veredicto depende del
 * diferencial entre ambas tasas. La celda del usuario va resaltada.
 */
export function SensitivityHeatmap({ input }: { input: RentVsBuyInput }) {
  const grid = useMemo(() => {
    return RENTAB.map((rentab) =>
      REVAL.map((reval) => {
        const r = runCompararAlquilerCompra({
          ...input,
          rentabilidadInversionAnual: rentab,
          revalorizacionViviendaAnual: reval,
        });
        return { rentab, reval, ventaja: r.ventajaCompra, pct: r.ventajaPorcentual };
      })
    );
  }, [input]);

  const maxAbs = Math.max(
    ...grid.flat().map((c) => Math.abs(c.pct)),
    1
  );

  const userRentab = nearest(input.rentabilidadInversionAnual, RENTAB);
  const userReval = nearest(input.revalorizacionViviendaAnual, REVAL);

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="border-separate" style={{ borderSpacing: 3 }}>
          <thead>
            <tr>
              <th className="px-1 pb-1 text-left align-bottom font-mono text-[9px] uppercase tracking-[0.1em] text-mist">
                Cartera ↓ / Vivienda →
              </th>
              {REVAL.map((rv) => (
                <th key={rv} scope="col" className="px-1 pb-1 text-center font-mono text-[10px] tabular text-stone">
                  {rv}%
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.map((row, i) => (
              <tr key={RENTAB[i]}>
                <th scope="row" className="pr-2 text-right font-mono text-[10px] font-normal tabular text-stone">
                  {RENTAB[i]}%
                </th>
                {row.map((cell) => {
                  const compra = cell.ventaja >= 0;
                  const intensity = Math.min(Math.abs(cell.pct) / maxAbs, 1);
                  const empate = Math.abs(cell.pct) < 5;
                  // Rampas suaves: el fondo se mantiene claro para que el texto
                  // ink conserve siempre contraste WCAG AA; el matiz (oro vs gris)
                  // y el signo distinguen al ganador.
                  const bg = empate
                    ? "rgba(168,164,155,0.12)"
                    : compra
                    ? `rgba(216,178,84,${0.15 + intensity * 0.6})`
                    : `rgba(47,52,55,${0.08 + intensity * 0.34})`;
                  const isUser = cell.rentab === userRentab && cell.reval === userReval;
                  const aria = `Cartera ${cell.rentab}% y vivienda ${cell.reval}%: gana ${
                    compra ? "comprar" : "alquilar"
                  } por ${formatEUR(Math.abs(cell.ventaja), { compact: true })}${
                    isUser ? " (tu escenario)" : ""
                  }`;
                  return (
                    <td key={cell.reval} className="p-0">
                      <div
                        role="img"
                        aria-label={aria}
                        className={`relative grid h-11 w-[58px] place-items-center rounded-md text-ink ${
                          isUser ? "ring-2 ring-ink ring-offset-1 ring-offset-paper-50" : ""
                        }`}
                        style={{ background: bg }}
                        title={aria}
                      >
                        <span className="font-mono text-[10px] tabular leading-none">
                          {compra ? "+" : "−"}
                          {formatEUR(Math.abs(cell.ventaja), { compact: true }).replace("€", "").trim()}
                        </span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-stone">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm" style={{ background: "rgba(216,178,84,0.7)" }} />
          Gana comprar
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm" style={{ background: "rgba(47,52,55,0.4)" }} />
          Gana alquilar
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm ring-2 ring-ink" />
          Tu escenario
        </span>
      </div>
    </div>
  );
}

function nearest(value: number, options: number[]): number {
  return options.reduce((best, o) =>
    Math.abs(o - value) < Math.abs(best - value) ? o : best
  );
}
