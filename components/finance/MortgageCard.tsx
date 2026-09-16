"use client";
import { Coins, Percent, ChartLine } from "@phosphor-icons/react";
import { cn, formatEUR } from "@/lib/utils";
import type { MortgageCalc } from "@/types";

export function MortgageCard({ data }: { data: MortgageCalc }) {
  const effort = Math.min(data.effortPercent, 100);
  const effortBand =
    data.effortPercent <= 30
      ? { label: "esfuerzo razonable", color: "bg-sage-500" }
      : data.effortPercent <= 40
      ? { label: "ajustado", color: "bg-saffron-300" }
      : { label: "alto, revisar", color: "bg-rose-500" };

  return (
    <article className="grainy-blob relative overflow-hidden rounded-xl border border-hairline bg-paper-50 p-6 animate-fade-up md:p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-saffron-700">
            Cuota mensual estimada
          </p>
          <p className="mt-3 font-display text-display-md font-medium leading-none tracking-tight text-ink tabular">
            {formatEUR(data.monthlyPayment)}
            <span className="ml-1 align-baseline font-mono text-xs text-stone">/mes</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
          <Stat
            label="Plazo"
            value={`${data.termYears} años`}
            icon={<ChartLine size={12} weight="bold" />}
          />
          <Stat
            label="Interés"
            value={`${data.interestRate.toFixed(2)} %`}
            icon={<Percent size={12} weight="bold" />}
          />
          <Stat
            label="Entrada"
            value={`${data.downPaymentPercent} %`}
            icon={<Coins size={12} weight="bold" />}
          />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-3">
        <KV label="Capital prestado" value={formatEUR(data.loanAmount)} />
        <KV label="Coste total" value={formatEUR(data.totalCost)} />
        <KV
          label="Intereses totales"
          value={formatEUR(data.totalInterest)}
          accent
        />
      </div>

      <div className="mt-7 border-t border-hairline pt-5">
        <div className="flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[0.16em] text-stone">
          <span>Esfuerzo con ingreso ilustrativo de 2.200 €/mes</span>
          <span className="text-ink tabular">
            {data.effortPercent.toFixed(1)} %
          </span>
        </div>
        <div className="mt-2 h-1.5 w-full rounded-full bg-paper-300">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-700 ease-editorial",
              effortBand.color
            )}
            style={{ width: `${effort}%` }}
          />
        </div>
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-stone">
          {effortBand.label}
        </p>
      </div>
    </article>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <span className="flex items-center gap-2 text-ink-700">
      <span className="text-stone">{icon}</span>
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-stone">
        {label}
      </span>
      <span className="font-mono text-xs tabular text-ink">{value}</span>
    </span>
  );
}

function KV({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-stone">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-display text-2xl leading-tight tabular",
          accent ? "text-saffron-700" : "text-ink"
        )}
      >
        {value}
      </p>
    </div>
  );
}
