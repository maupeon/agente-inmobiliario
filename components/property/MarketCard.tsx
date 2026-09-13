"use client";
import {
  ArrowUpRight,
  Bank,
  ChartLineUp,
  TrendDown,
  TrendUp,
  WarningCircle,
} from "@phosphor-icons/react";
import { cn, formatNumber, timeAgo } from "@/lib/utils";
import type { MarketAnalysis } from "@/types";

/**
 * Lectura visual del análisis de mercado. Cada bloque cita su fuente y la
 * frescura del dato — si proviene de los fixtures de respaldo, lo marcamos
 * en rojo discreto para que el usuario sepa que no es un dato vivo.
 */
export function MarketCard({ data }: { data: MarketAnalysis }) {
  const { comparacion, tendencia, hipoteca, fuentes, actualizado } = data;

  return (
    <article className="grainy-blob relative overflow-hidden rounded-xl border border-hairline bg-paper-50 p-6 animate-fade-up md:p-8">
      <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-hairline pb-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-saffron-700">
          Inteligencia de mercado · {data.provincia.encontrada ?? data.provincia.consultada}
        </p>
        {actualizado.contieneRespaldo && (
          <span
            className="inline-flex items-center gap-1.5 rounded-md border border-rose-500/30 bg-rose-50 px-2 py-0.5 text-rose-500"
            title="Algún dato proviene de la copia de respaldo local. Ejecuta el cron /api/cron/market para refrescar."
          >
            <WarningCircle size={11} weight="bold" />
            <span className="font-mono text-[9px] uppercase tracking-[0.16em]">
              datos de respaldo
            </span>
          </span>
        )}
      </header>

      <div className="grid grid-cols-1 gap-6 pt-5 md:grid-cols-3 md:gap-8">
        <ComparisonBlock data={comparacion} />
        <TrendBlock data={tendencia} />
        <MortgageRateBlock data={hipoteca} />
      </div>

      <Sources fuentes={fuentes} actualizado={actualizado} />
    </article>
  );
}

function ComparisonBlock({ data }: { data: MarketAnalysis["comparacion"] }) {
  const diff = data.diferenciaPorcentual;
  const tone =
    diff == null
      ? "neutral"
      : diff <= -8
      ? "below"
      : diff < 8
      ? "fair"
      : "above";

  const toneClass =
    tone === "below"
      ? "text-sage-500"
      : tone === "above"
      ? "text-rose-500"
      : tone === "fair"
      ? "text-saffron-700"
      : "text-stone";

  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-stone">
        vs. media provincia
      </p>
      <p className={cn("mt-2 font-display text-3xl font-medium leading-none tabular", toneClass)}>
        {diff == null ? "—" : `${diff > 0 ? "+" : ""}${diff.toFixed(1)}%`}
      </p>
      <p className="mt-2 text-sm leading-snug text-ink-700">
        {data.valoracion ?? "no hay precio medio para esta provincia"}
      </p>
      {data.precioM2Provincia != null && (
        <p className="mt-3 font-mono text-[11px] tabular text-stone">
          {formatNumber(data.precioM2Propiedad)} €/m² · media{" "}
          {formatNumber(data.precioM2Provincia)} €/m²
        </p>
      )}
    </div>
  );
}

function TrendBlock({ data }: { data: MarketAnalysis["tendencia"] }) {
  const last = data.ultimoTrimestre;
  const Icon = last == null ? ChartLineUp : last.variacionInteranual >= 0 ? TrendUp : TrendDown;
  const toneClass =
    last == null
      ? "text-stone"
      : last.variacionInteranual >= 0
      ? "text-sage-500"
      : "text-rose-500";

  return (
    <div className="md:border-l md:border-hairline md:pl-8">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-stone">
        IPV España · variación anual
      </p>
      <div className="mt-2 flex items-baseline gap-2">
        <Icon size={18} weight="bold" className={toneClass} />
        <p className={cn("font-display text-3xl font-medium leading-none tabular", toneClass)}>
          {last == null
            ? "—"
            : `${last.variacionInteranual > 0 ? "+" : ""}${last.variacionInteranual.toFixed(1)}%`}
        </p>
      </div>
      {last && (
        <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.14em] text-stone">
          {last.periodo}
        </p>
      )}
      {data.resumen && (
        <p className="mt-2 text-sm leading-snug text-ink-700">{data.resumen}</p>
      )}
      {data.serie.length > 1 && <Sparkline serie={data.serie} className="mt-3" />}
    </div>
  );
}

function MortgageRateBlock({ data }: { data: MarketAnalysis["hipoteca"] }) {
  return (
    <div className="md:border-l md:border-hairline md:pl-8">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-stone">
        Tipo medio hipotecario
      </p>
      <div className="mt-2 flex items-baseline gap-2">
        <Bank size={18} weight="bold" className="text-ink" />
        <p className="font-display text-3xl font-medium leading-none tabular text-ink">
          {data.tipoMedio == null ? "—" : `${data.tipoMedio.toFixed(2)}%`}
        </p>
      </div>
      {data.periodo && (
        <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.14em] text-stone">
          {data.periodo}
        </p>
      )}
      {data.euribor12m != null && (
        <p className="mt-3 font-mono text-[11px] tabular text-stone">
          Euríbor 12m · <span className="text-ink">{data.euribor12m.toFixed(2)}%</span>
        </p>
      )}
    </div>
  );
}

function Sparkline({
  serie,
  className,
}: {
  serie: MarketAnalysis["tendencia"]["serie"];
  className?: string;
}) {
  const values = serie.map((p) => p.variacionInteranual);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0.1);
  const range = max - min || 1;
  const W = 100;
  const H = 28;
  const stepX = serie.length > 1 ? W / (serie.length - 1) : 0;

  const points = values
    .map((v, i) => `${(i * stepX).toFixed(2)},${(H - ((v - min) / range) * H).toFixed(2)}`)
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className={cn("h-7 w-full text-saffron-300", className)}
      aria-hidden
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      <circle
        cx={(values.length - 1) * stepX}
        cy={H - ((values[values.length - 1] - min) / range) * H}
        r="2"
        fill="currentColor"
      />
    </svg>
  );
}

function Sources({
  fuentes,
  actualizado,
}: {
  fuentes: MarketAnalysis["fuentes"];
  actualizado: MarketAnalysis["actualizado"];
}) {
  return (
    <footer className="mt-6 grid gap-2 border-t border-hairline pt-4 sm:grid-cols-3">
      <SourceLine
        label="Precio €/m²"
        fuente={fuentes.precioProvincia}
        updatedAt={actualizado.precioProvincia}
        href="https://www.ine.es/dyngs/INEbase/es/operacion.htm?c=Estadistica_C&cid=1254736171438"
      />
      <SourceLine
        label="Tendencia IPV"
        fuente={fuentes.ipv}
        updatedAt={actualizado.ipv}
        href="https://www.ine.es/jaxiT3/Tabla.htm?t=25171"
      />
      <SourceLine
        label="Tipo hipotecario"
        fuente={fuentes.bde}
        updatedAt={actualizado.bde}
        href="https://www.bde.es/webbde/es/estadis/infoest/tipos/tipos.html"
      />
    </footer>
  );
}

function SourceLine({
  label,
  fuente,
  updatedAt,
  href,
}: {
  label: string;
  fuente: string;
  updatedAt: string | null;
  href: string;
}) {
  return (
    <div className="min-w-0">
      <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-mist">
        {label}
      </p>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 inline-flex max-w-full items-center gap-1 text-[11px] leading-tight text-ink-700 transition hover:text-saffron-700"
      >
        <span className="truncate">{fuente}</span>
        <ArrowUpRight size={11} weight="bold" className="shrink-0 text-stone" />
      </a>
      <p className="mt-0.5 font-mono text-[10px] tabular text-stone">
        {updatedAt ? `cache ${timeAgo(updatedAt)}` : "respaldo local"}
      </p>
    </div>
  );
}
