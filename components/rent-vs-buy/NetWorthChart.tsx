"use client";
import { useId } from "react";
import { formatEUR } from "@/lib/utils";
import type { RentVsBuyYear } from "@/types";

/**
 * Curva de cruce de patrimonio: dos líneas (comprar vs alquilar) sobre el eje
 * de años, con el punto de equilibrio marcado y el área entre curvas sombreada.
 * SVG hecho a mano (sin librería de charts) para encajar en el sistema editorial.
 */
export function NetWorthChart({
  serie,
  breakEvenAnios,
  ganador,
  enReales,
}: {
  serie: RentVsBuyYear[];
  breakEvenAnios: number | null;
  ganador: "comprar" | "alquilar";
  enReales: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const W = 760;
  const H = 360;
  const padL = 64;
  const padR = 24;
  const padT = 28;
  const padB = 40;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const n = serie.length;
  if (n === 0) return null;

  const xs = serie.map((d) => d.anio);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const allY = serie.flatMap((d) => [d.patrimonioCompra, d.patrimonioAlquiler]);
  const yMaxRaw = Math.max(...allY, 0);
  const yMinRaw = Math.min(...allY, 0);
  const yPad = (yMaxRaw - yMinRaw) * 0.08 || 1000;
  const yMax = yMaxRaw + yPad;
  const yMin = yMinRaw - (yMinRaw < 0 ? yPad : 0);

  const x = (anio: number) =>
    padL + (xMax === xMin ? plotW / 2 : ((anio - xMin) / (xMax - xMin)) * plotW);
  const y = (v: number) =>
    padT + (yMax === yMin ? plotH / 2 : ((yMax - v) / (yMax - yMin)) * plotH);

  const lineCompra = serie.map((d) => `${x(d.anio)},${y(d.patrimonioCompra)}`).join(" ");
  const lineAlquiler = serie.map((d) => `${x(d.anio)},${y(d.patrimonioAlquiler)}`).join(" ");

  // Área entre las dos curvas (banda de ventaja).
  const areaPath =
    serie.map((d, i) => `${i === 0 ? "M" : "L"}${x(d.anio)},${y(d.patrimonioCompra)}`).join(" ") +
    " " +
    [...serie].reverse().map((d) => `L${x(d.anio)},${y(d.patrimonioAlquiler)}`).join(" ") +
    " Z";

  // Líneas de cuadrícula horizontales (4 niveles).
  const ticks = 4;
  const yTicks = Array.from({ length: ticks + 1 }, (_, i) => yMin + ((yMax - yMin) * i) / ticks);

  // Marcas del eje X: hasta ~8 años visibles sin saturar.
  const stepX = Math.max(1, Math.ceil(n / 8));
  const xTicks = serie.filter((d, i) => i % stepX === 0 || i === n - 1).map((d) => d.anio);

  const winColor = "#2D7C59"; // verde HabitIA
  const compraColor = ganador === "comprar" ? winColor : "#2F3437";
  const alquilerColor = ganador === "alquilar" ? winColor : "#2F3437";
  const compraIsWinner = ganador === "comprar";

  const beX = breakEvenAnios != null && breakEvenAnios >= xMin ? x(Math.max(breakEvenAnios, xMin)) : null;

  const last = serie[n - 1];

  const descText = `Patrimonio neto a ${last.anio} años — comprar: ${formatEUR(
    last.patrimonioCompra
  )}; alquilar e invertir: ${formatEUR(last.patrimonioAlquiler)}. Punto de equilibrio: ${
    breakEvenAnios != null
      ? `${String(breakEvenAnios).replace(".", ",")} años`
      : "no se alcanza en el horizonte"
  }. Cifras en ${enReales ? "€ de hoy" : "€ nominales"}.`;

  return (
    <figure className="w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label="Evolución del patrimonio neto: comprar frente a alquilar"
        aria-describedby={`desc-${uid}`}
      >
        <desc id={`desc-${uid}`}>{descText}</desc>
        <defs>
          <linearGradient id={`band-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={winColor} stopOpacity="0.14" />
            <stop offset="100%" stopColor={winColor} stopOpacity="0.03" />
          </linearGradient>
        </defs>

        {/* Cuadrícula + etiquetas del eje Y */}
        {yTicks.map((v, i) => (
          <g key={i}>
            <line
              x1={padL}
              x2={W - padR}
              y1={y(v)}
              y2={y(v)}
              stroke={Math.abs(v) < 1 ? "#D9D5CB" : "#EAE7DF"}
              strokeWidth={Math.abs(v) < 1 ? 1.2 : 1}
            />
            <text
              x={padL - 10}
              y={y(v) + 3.5}
              textAnchor="end"
              className="fill-mist"
              style={{ fontSize: 10, fontFamily: "var(--font-mono), monospace" }}
            >
              {formatEUR(v, { compact: true })}
            </text>
          </g>
        ))}

        {/* Eje X */}
        {xTicks.map((a) => (
          <text
            key={a}
            x={x(a)}
            y={H - padB + 18}
            textAnchor="middle"
            className="fill-mist"
            style={{ fontSize: 10, fontFamily: "var(--font-mono), monospace" }}
          >
            {a}
          </text>
        ))}
        <text
          x={padL + plotW / 2}
          y={H - 4}
          textAnchor="middle"
          className="fill-stone"
          style={{ fontSize: 9, letterSpacing: "0.14em", fontFamily: "var(--font-mono), monospace" }}
        >
          AÑOS
        </text>

        {/* Banda de ventaja */}
        <path d={areaPath} fill={`url(#band-${uid})`} />

        {/* Marca del break-even */}
        {beX != null && (
          <g>
            <line
              x1={beX}
              x2={beX}
              y1={padT}
              y2={H - padB}
              stroke="#2D7C59"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
            <circle cx={beX} cy={padT} r={3} fill="#2D7C59" />
            <text
              x={beX + 6}
              y={padT + 11}
              className="fill-saffron-700"
              style={{ fontSize: 10, fontStyle: "italic", fontFamily: "var(--font-display), serif" }}
            >
              equilibrio · {String(breakEvenAnios).replace(".", ",")} años
            </text>
          </g>
        )}

        {/* Líneas */}
        {n > 1 && (
          <>
            <polyline points={lineAlquiler} fill="none" stroke={alquilerColor} strokeWidth={alquilerColor === winColor ? 2.5 : 1.75} strokeLinejoin="round" strokeLinecap="round" opacity={alquilerColor === winColor ? 1 : 0.7} />
            <polyline points={lineCompra} fill="none" stroke={compraColor} strokeWidth={compraColor === winColor ? 2.5 : 1.75} strokeLinejoin="round" strokeLinecap="round" opacity={compraColor === winColor ? 1 : 0.7} />
          </>
        )}

        {/* Puntos finales + valor */}
        <EndDot x={x(last.anio)} y={y(last.patrimonioCompra)} color={compraColor} value={last.patrimonioCompra} above={last.patrimonioCompra >= last.patrimonioAlquiler} />
        <EndDot x={x(last.anio)} y={y(last.patrimonioAlquiler)} color={alquilerColor} value={last.patrimonioAlquiler} above={last.patrimonioAlquiler > last.patrimonioCompra} />
      </svg>

      <figcaption className="mt-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-stone">
          <Legend color={compraColor} bold={compraIsWinner} label="Comprar" />
          <Legend color={alquilerColor} bold={!compraIsWinner} label="Alquilar e invertir" />
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-mist">
          Patrimonio neto · {enReales ? "€ de hoy" : "€ nominales"}
        </span>
      </figcaption>
    </figure>
  );
}

function EndDot({ x, y, color, value, above }: { x: number; y: number; color: string; value: number; above: boolean }) {
  return (
    <g>
      <circle cx={x} cy={y} r={3.5} fill={color} />
      <text
        x={x - 6}
        y={above ? y - 8 : y + 14}
        textAnchor="end"
        style={{ fontSize: 10.5, fontFamily: "var(--font-mono), monospace", fontVariantNumeric: "tabular-nums" }}
        fill={color}
      >
        {formatEUR(value, { compact: true })}
      </text>
    </g>
  );
}

function Legend({ color, label, bold }: { color: string; label: string; bold: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-block h-[3px] w-5 rounded-full" style={{ background: color }} />
      <span className={bold ? "text-ink" : ""}>{label}</span>
    </span>
  );
}
