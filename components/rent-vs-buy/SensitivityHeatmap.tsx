"use client";
import { useMemo } from "react";
import { runCompararAlquilerCompra } from "@/lib/finance/rent-vs-buy";
import { formatEUR } from "@/lib/utils";
import type { RentVsBuyInput } from "@/types";

const REVAL = [1, 2, 3, 4, 5, 6]; // columnas: revalorización vivienda
const RENTAB = [9, 8, 7, 6, 5, 4]; // filas (de arriba a abajo): rentabilidad cartera
const percent = (value: number) => `${String(value).replace(".", ",")}%`;

/**
 * Mapa de sensibilidad: para cada combinación de rentabilidad de la cartera ×
 * revalorización de la vivienda, re-ejecuta el motor y colorea la celda según
 * quién gana y por cuánto. Comunica con honestidad que el veredicto depende del
 * diferencial entre ambas tasas. La celda del usuario va resaltada.
 */
export function SensitivityHeatmap({ input }: { input: RentVsBuyInput }) {
  // Include the exact chosen rates: never label a nearby cell as the user's case.
  const revaluations = useMemo(() => Array.from(new Set([...REVAL, input.revalorizacionViviendaAnual])).sort((a, b) => a - b), [input.revalorizacionViviendaAnual]);
  const returns = useMemo(() => Array.from(new Set([...RENTAB, input.rentabilidadInversionAnual])).sort((a, b) => b - a), [input.rentabilidadInversionAnual]);
  const grid = useMemo(() => {
    return returns.map((rentab) =>
      revaluations.map((reval) => {
        const r = runCompararAlquilerCompra({
          ...input,
          rentabilidadInversionAnual: rentab,
          revalorizacionViviendaAnual: reval,
        });
        return { rentab, reval, ventaja: r.ventajaCompra, pct: r.ventajaPorcentual };
      })
    );
  }, [input, returns, revaluations]);

  const maxAbs = Math.max(
    ...grid.flat().map((c) => Math.abs(c.pct)),
    1
  );

  return (
    <div>
      <p className="mb-3 text-xs leading-relaxed text-stone-600">Ventaja de patrimonio a {input.horizonteAnios} años, en {input.mostrarEnReales ? "euros de hoy" : "euros nominales"}. Las cifras son magnitudes positivas a favor de la opción escrita en cada casilla.</p>
      <p className="mb-3 text-xs text-stone-600 sm:hidden">Desliza la tabla horizontalmente para ver todas las combinaciones.</p>
      <div className="overflow-x-auto pb-2" tabIndex={0} role="region" aria-label="Tabla de sensibilidad con desplazamiento horizontal">
        <table className="border-separate" style={{ borderSpacing: 3 }}>
          <caption className="pb-3 text-left text-xs font-medium text-ink">Columnas → revalorización anual de la vivienda</caption>
          <thead>
            <tr>
              <th className="px-1 pb-1 text-left align-bottom font-mono text-[9px] uppercase tracking-[0.1em] text-mist">
                Cartera financiera ↓
              </th>
              {revaluations.map((rv) => (
                <th key={rv} scope="col" className="px-1 pb-1 text-center font-mono text-[10px] tabular text-stone">
                  {percent(rv)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.map((row, i) => (
              <tr key={returns[i]}>
                <th scope="row" className="pr-2 text-right font-mono text-[10px] font-normal tabular text-stone">
                  {percent(returns[i])}
                </th>
                {row.map((cell) => {
                  const compra = cell.ventaja >= 0;
                  const intensity = Math.min(Math.abs(cell.pct) / maxAbs, 1);
                  const empate = cell.ventaja === 0;
                  // Rampas suaves: el fondo se mantiene claro para que el texto
                  // ink conserve siempre contraste WCAG AA; el matiz (oro vs gris)
                  // y la etiqueta distinguen al ganador.
                  const bg = empate
                    ? "rgba(168,164,155,0.12)"
                    : compra
                    ? `rgba(216,178,84,${0.15 + intensity * 0.6})`
                    : `rgba(47,52,55,${0.08 + intensity * 0.34})`;
                  const isUser = cell.rentab === input.rentabilidadInversionAnual && cell.reval === input.revalorizacionViviendaAnual;
                  const aria = `Cartera financiera ${percent(cell.rentab)} anual y revalorización de vivienda ${percent(cell.reval)} anual: ${
                    empate ? "empate" : compra ? "comprar tiene ventaja" : "alquilar tiene ventaja"
                  } de ${formatEUR(Math.abs(cell.ventaja), { compact: true })}${
                    isUser ? " (tu escenario)" : ""
                  }`;
                  return (
                    <td key={cell.reval} className="p-0">
                      <div
                        role="img"
                        aria-label={aria}
                        className={`relative flex h-14 w-[66px] flex-col items-center justify-center gap-1 rounded-md text-ink ${
                          isUser ? "ring-2 ring-ink ring-offset-1 ring-offset-paper-50" : ""
                        }`}
                        style={{ background: bg }}
                        title={aria}
                      >
                        <span className="text-[9px] leading-none">{empate ? "Empate" : compra ? "Comprar" : "Alquilar"}</span>
                        <span className="font-mono text-[10px] tabular leading-none">
                          {formatEUR(Math.abs(cell.ventaja), { compact: true })}
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
