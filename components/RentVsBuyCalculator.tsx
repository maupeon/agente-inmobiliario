"use client";
import { useMemo, useState } from "react";
import { Warning, Info, Scales, CaretDown } from "@phosphor-icons/react";
import { cn, formatEUR, formatNumber } from "@/lib/utils";
import {
  RENT_VS_BUY_DEFAULTS,
  RENT_VS_BUY_FIELDS,
  runCompararAlquilerCompra,
  type RentVsBuyField,
} from "@/lib/finance/rent-vs-buy";
import type { RentVsBuyAviso, RentVsBuyInput, RentVsBuyResult } from "@/types";
import { NetWorthChart } from "./rent-vs-buy/NetWorthChart";
import { SensitivityHeatmap } from "./rent-vs-buy/SensitivityHeatmap";

const field = (campo: keyof RentVsBuyInput) =>
  RENT_VS_BUY_FIELDS.find((f) => f.campo === campo)!;

const SEC_PARTIDA: Array<keyof RentVsBuyInput> = ["capitalDisponible", "horizonteAnios"];
const SEC_COMPRA: Array<keyof RentVsBuyInput> = [
  "precioVivienda", "esObraNueva", "gastosCompraPorcentaje", "gastosInicialesCompra", "revalorizacionViviendaAnual",
];
const SEC_HIPOTECA: Array<keyof RentVsBuyInput> = ["entradaPorcentaje", "tipoInteres", "plazoHipotecaAnios"];
const SEC_ALQUILER: Array<keyof RentVsBuyInput> = ["alquilerMensual", "gastosInicialesAlquiler", "subidaAlquilerAnual"];
const SEC_PERSONAL: Array<keyof RentVsBuyInput> = ["ingresoAnualNeto", "liquidezNecesaria", "estabilidadLaboral", "crecimientoSalarialEsperado"];
const SEC_COSTES_COMPRA: Array<keyof RentVsBuyInput> = ["ibiAnual", "comunidadMensual", "seguroHogarAnual", "mantenimientoPorcentaje", "gestionCompraAnual"];
const SEC_COSTES_ALQUILER: Array<keyof RentVsBuyInput> = ["seguroInquilinoAnual", "gestionAlquilerAnual"];
const SEC_FISCAL: Array<keyof RentVsBuyInput> = ["gastosVentaPorcentaje", "plusvaliaMunicipalPorcentaje", "viviendaHabitual", "exencionGananciaVenta"];

export function RentVsBuyCalculator() {
  const [input, setInput] = useState<RentVsBuyInput>(RENT_VS_BUY_DEFAULTS);
  const result = useMemo(() => runCompararAlquilerCompra(input), [input]);

  const setRaw = (k: keyof RentVsBuyInput, v: number | boolean) =>
    setInput((s) => ({ ...s, [k]: v,
      ...(k === "esObraNueva" ? { gastosCompraPorcentaje: v ? 11.5 : 10 } : {}),
    } as RentVsBuyInput));

  const reset = () => setInput(RENT_VS_BUY_DEFAULTS);

  const controls = (fields: Array<keyof RentVsBuyInput>) => fields.map((c) => (
    <Control key={c} meta={field(c)} input={input} set={setRaw} />
  ));

  return (
    <main className="mx-auto w-full max-w-[1200px] px-5 pb-24 pt-10 sm:px-8">
      <div className="flex items-center justify-between gap-4 border-y border-ink py-2.5 font-mono text-[10px] uppercase tracking-[0.22em] text-ink">
        <span>Comprar o alquilar</span>
        <span className="hidden sm:inline">Calculadora de patrimonio</span>
        <span className="tabular text-stone">№ 004</span>
      </div>

      <header className="mt-10 max-w-[64ch]">
        <h1 className="font-display text-display-md text-ink text-balance">
          ¿Y a ti, qué te sale más rentable, comprar o alquilar?
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-stone-600">
          Compara cómo evoluciona <strong className="font-medium text-ink">todo tu patrimonio</strong>.
          Partimos de tus ahorros e inversiones actuales: al comprar, descontamos
          la entrada y los gastos; al alquilar, el capital que conservas sigue invertido.
          En ambas opciones, el dinero restante genera la rentabilidad que indiques.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-stone-600">
          Los valores iniciales son ejemplos editables. Usa viviendas comparables.
          La venta final es una valoración hipotética para poder comparar; no supone que debas mudarte.
        </p>
        <Glossary />
      </header>

      <div className="mt-10 grid gap-8 lg:grid-cols-[clamp(320px,30vw,380px)_1fr] lg:items-start">
        {/* ───────── Controles ───────── */}
        <div className="rounded-2xl border border-hairline bg-paper-50 p-5 sm:p-6">
          <div className="flex items-center justify-between border-b border-hairline pb-3">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink">
              Tu caso
            </h2>
            <button
              type="button"
              onClick={reset}
              className="min-h-11 font-mono text-[10px] uppercase tracking-[0.14em] text-stone transition hover:text-ink"
            >
              Restablecer
            </button>
          </div>

          {!result.feasible && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-saffron-300/50 bg-saffron-50 p-3">
              <Warning size={15} weight="fill" className="mt-0.5 shrink-0 text-saffron-700" />
              <p className="text-xs leading-relaxed text-ink-700">
                Con {formatEUR(result.inputs.capitalDisponible)} no llegas a la
                entrada + gastos ({formatEUR(result.desembolsoInicialCompra)}):
                faltan{" "}
                {formatEUR(
                  result.desembolsoInicialCompra - result.inputs.capitalDisponible
                )}
                . La simulación asume que reúnes el desembolso.
              </p>
            </div>
          )}

          <p className="mt-4 text-xs leading-relaxed text-stone-600">
            Abre cada grupo para ajustar sus datos. El resumen y los resultados se actualizan al instante.
          </p>

          <FieldSection
            number="01"
            title="Tu punto de partida"
            summary={`${formatEUR(input.capitalDisponible)} · ${input.horizonteAnios} años`}
            description="El capital y el plazo que comparten ambas alternativas."
            defaultOpen
          >
            {controls(SEC_PARTIDA)}
          </FieldSection>

          <FieldSection
            number="02"
            title="Compra de la vivienda"
            summary={`${formatEUR(input.precioVivienda)} · ${input.esObraNueva ? "obra nueva" : "segunda mano"}`}
            description="Precio, impuestos, gastos iniciales y costes de ser propietario."
          >
            {controls(SEC_COMPRA)}
            <AdvancedGroup title="Gastos anuales de ser propietario">
              {controls(SEC_COSTES_COMPRA)}
            </AdvancedGroup>
          </FieldSection>

          <FieldSection
            number="03"
            title="Hipoteca"
            summary={`${formatNumber(input.entradaPorcentaje)} % de entrada · ${formatNumber(input.tipoInteres)} % TIN · ${input.plazoHipotecaAnios} años`}
            description="La parte que aportas y las condiciones del préstamo."
          >
            {controls(SEC_HIPOTECA)}
          </FieldSection>

          <FieldSection
            number="04"
            title="Alquiler"
            summary={`${formatEUR(input.alquilerMensual)}/mes · subida del ${formatNumber(input.subidaAlquilerAnual)} % anual`}
            description="La renta de una vivienda comparable y sus gastos."
          >
            {controls(SEC_ALQUILER)}
            <AdvancedGroup title="Seguro y otros costes del alquiler">
              {controls(SEC_COSTES_ALQUILER)}
            </AdvancedGroup>
          </FieldSection>

          <FieldSection
            number="05"
            title="Inversión e inflación"
            summary={`${formatNumber(input.rentabilidadInversionAnual)} % de rentabilidad · ${input.mostrarEnReales ? "€ de hoy" : "€ nominales"}`}
            description="La rentabilidad del capital que conservas y la evolución de los gastos."
          >
            {controls(["rentabilidadInversionAnual", "inflacionCostes"])}
            <AdvancedGroup title="Inflación y forma de ver el patrimonio">
              {controls(["inflacionAnual"])}
              <ToggleField label="Patrimonio en € de hoy" nota="Descuenta la inflación general para comparar el poder de compra actual de ambas alternativas." value={input.mostrarEnReales} onChange={(b) => setRaw("mostrarEnReales", b)} />
              <ToggleField label="Descontar impuestos de la cartera" nota="Simula liquidar ambas carteras junto a la venta hipotética. El IRPF de la vivienda sigue incluido aunque desactives esta opción." value={input.liquidarCarteraAlFinal} onChange={(b) => setRaw("liquidarCarteraAlFinal", b)} />
            </AdvancedGroup>
          </FieldSection>

          <FieldSection
            number="06"
            title="Ingresos y liquidez"
            summary={`${formatEUR(input.ingresoAnualNeto)} netos/año`}
            description="Tu capacidad de pago y la flexibilidad que necesitas."
          >
            {controls(SEC_PERSONAL)}
          </FieldSection>

          <FieldSection
            number="07"
            title="Venta e impuestos"
            summary={`${formatNumber(input.gastosVentaPorcentaje)} % de gastos de venta · ${input.viviendaHabitual && input.exencionGananciaVenta ? "con exención simulada" : "sin exención"}`}
            description="Los costes de liquidar la vivienda al final de la simulación."
          >
            <p className="text-xs leading-relaxed text-stone-600">Se calcula el valor neto de vender al cierre de cada año. Estos ajustes no crean un escenario de mudanza, alquiler a terceros ni cambio de residencia fiscal.</p>
            {controls(SEC_FISCAL)}
          </FieldSection>
        </div>

        {/* ───────── Resultados ───────── */}
        <div className="min-w-0 space-y-7">
          <Verdict r={result} />
          <ChartCard r={result} />
          <MirrorColumns r={result} />
          <FondoPerdido r={result} />
          <Avisos avisos={result.avisos} />
          <SensitivityCard input={result.inputs} />
          <AuditDetails r={result} />
          <Disclaimer />
        </div>
      </div>
    </main>
  );
}

/* ════════════════════════ Resultados ════════════════════════ */

function Verdict({ r }: { r: RentVsBuyResult }) {
  const v = r.veredicto;
  const N = r.inputs.horizonteAnios;
  const empate = v.banda === "empate";
  const headline = empate
    ? "Casi empate"
    : v.ganador === "comprar"
    ? "Comprar"
    : "Alquilar e invertir";
  const bandaCls = {
    empate: "border-hairline-strong bg-paper-200 text-stone",
    moderada: "border-saffron-300/40 bg-saffron-50 text-saffron-700",
    clara: "border-sage-500/30 bg-sage-50 text-sage-500",
  }[v.banda];

  return (
    <section className="grainy-blob relative overflow-hidden rounded-2xl border border-hairline bg-paper-50 p-6 animate-fade-up sm:p-8">
      {v.overrideSubjetivo && (
        <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-saffron-300/50 bg-saffron-50 p-3.5">
          <Warning size={16} weight="fill" className="mt-0.5 shrink-0 text-saffron-700" />
          <p className="text-sm leading-relaxed text-ink-700">
            En puro dinero gana <strong className="font-medium">{v.ganador === "comprar" ? "comprar" : "alquilar"}</strong>{" "}
            ({formatEUR(Math.abs(r.ventajaCompra))}), pero por tu movilidad la
            recomendación práctica se inclina hacia{" "}
            <strong className="font-medium text-saffron-700">alquilar</strong> y mantener la flexibilidad.
          </p>
        </div>
      )}

      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-saffron-700">
        Veredicto · a {N} años · {r.enReales ? "€ de hoy" : "€ nominales"}
      </p>

      <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-2">
        <h2 className="flex items-center gap-2.5 font-display text-display-md font-medium leading-none tracking-tight text-ink">
          <Scales size={30} weight="light" className="text-saffron-500" />
          {headline}
        </h2>
        <span
          className={cn(
            "rounded-md border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em]",
            bandaCls
          )}
        >
          ventaja {v.banda}
        </span>
      </div>

      {!empate && (
        <p className="mt-4 font-display text-3xl leading-none tabular text-saffron-700 sm:text-4xl">
          {formatEUR(Math.abs(r.ventajaCompra))}
          <span className="ml-2 align-baseline font-sans text-sm font-normal text-stone">
            más de patrimonio neto
          </span>
        </p>
      )}

      <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-ink-700">
        {v.resumen}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-hairline pt-5 sm:grid-cols-4">
        <KPI
          label="Punto de equilibrio"
          value={
            r.breakEvenAnios != null
              ? `${String(r.breakEvenAnios).replace(".", ",")} años`
              : "No llega"
          }
        />
        <KPI label="Cuota mensual" value={formatEUR(r.cuotaMensual)} />
        <KPI label="Entrada + gastos" value={formatEUR(r.desembolsoInicialCompra)} />
        <KPI
          label="Precio / alquiler de un año"
          value={r.priceToRent != null ? `×${String(r.priceToRent).replace(".", ",")}` : "—"}
        />
      </div>
      <p className="mt-4 text-xs leading-relaxed text-stone-600">
        Precio / alquiler anual: {formatEUR(r.inputs.precioVivienda)} ÷ ({formatEUR(r.inputs.alquilerMensual)} × 12).
        Son años de la renta actual equivalentes al precio, sin subidas ni gastos; no es el plazo de amortización.
      </p>
    </section>
  );
}

function ChartCard({ r }: { r: RentVsBuyResult }) {
  return (
    <section className="rounded-2xl border border-hairline bg-paper-50 p-6 sm:p-8">
      <SectionHead
        eyebrow="La película"
        title="Cómo evoluciona tu patrimonio"
        sub="Cada punto es el patrimonio neto al cerrar un año. Incluye lo invertido y, al comprar, el valor de la vivienda menos deuda y costes de una venta hipotética. Las curvas pueden cruzarse varias veces."
      />
      <div className="mt-6">
        <NetWorthChart
          serie={r.serie}
          breakEvenAnios={r.breakEvenAnios}
          ganador={r.veredicto.ganador}
          enReales={r.enReales}
        />
      </div>
    </section>
  );
}

function MirrorColumns({ r }: { r: RentVsBuyResult }) {
  const N = r.inputs.horizonteAnios;
  const last = r.serie[r.serie.length - 1];
  const sellingCosts = (r.totales.costesVentaFinal ?? 0) + (r.totales.plusvaliaMunicipalFinal ?? 0) + (r.totales.impuestoVentaFinal ?? 0);
  const fondoCompra = r.totales.interesesTotales + r.totales.tenenciaTotal + r.totales.gastosCompra + (r.totales.gastosInicialesCompra ?? 0) + sellingCosts;
  const fondoAlquiler = r.totales.rentaTotal + (r.totales.gastosInicialesAlquiler ?? 0) + (r.totales.segurosAlquilerTotal ?? 0) + (r.totales.gestionAlquilerTotal ?? 0);
  const deflator = r.enReales ? Math.pow(1 + r.inputs.inflacionAnual / 100, N) : 1;
  const colchon = Math.max(r.inputs.capitalDisponible - r.desembolsoInicialCompra, 0);
  const aporteCompra = Math.round(r.serie.reduce((a, d) => a + d.aporteCompra, 0) / N);
  const aporteAlquiler = Math.round(r.serie.reduce((a, d) => a + d.aporteAlquiler, 0) / N);
  const ganaCompra = r.veredicto.ganador === "comprar";

  const rows: Array<{ label: string; alquiler: string; compra: string; strong?: boolean }> = [
    {
      label: `Patrimonio a ${N} años`,
      alquiler: formatEUR(r.patrimonioFinalAlquiler),
      compra: formatEUR(r.patrimonioFinalCompra),
      strong: true,
    },
    {
      label: "Gastos acumulados (€ nominales)",
      alquiler: formatEUR(fondoAlquiler),
      compra: formatEUR(fondoCompra),
    },
    {
      label: `Patrimonio desglosado (${r.enReales ? "€ de hoy" : "nominal"})`,
      alquiler: `${formatEUR((last?.carteraAlquiler ?? 0) / deflator)} en cartera`,
      compra: `${formatEUR((last?.equityInmo ?? 0) / deflator)} en vivienda + ${formatEUR((last?.carteraCompra ?? 0) / deflator)} en cartera`,
    },
    {
      label: "Aportación media / año (nominal)",
      alquiler: `${formatEUR(aporteAlquiler)}`,
      compra: `${formatEUR(aporteCompra)}`,
    },
    {
      label: "Liquidez inicial",
      alquiler: `${formatEUR(Math.max(r.inputs.capitalDisponible - (r.inputs.gastosInicialesAlquiler ?? 0), 0))} para invertir`,
      compra: colchon > 0 ? `${formatEUR(colchon)} de colchón` : "Casi nula",
    },
    {
      label: "Movilidad",
      alquiler: "Alta · te puedes mover",
      compra: "Requiere vender o gestionar la vivienda",
    },
  ];

  return (
    <section className="overflow-hidden rounded-2xl border border-hairline bg-paper-50">
      <div className="p-6 pb-0 sm:p-8 sm:pb-0">
        <SectionHead
          eyebrow="Cara a cara"
          title="Alquilar vs. comprar, partida a partida"
          sub="Mismo presupuesto en ambos: quien gasta menos en vivienda invierte la diferencia."
        />
      </div>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-y border-hairline">
              <th className="px-6 py-3 text-left font-mono text-[10px] uppercase tracking-[0.14em] text-stone sm:px-8" />
              <th
                className={cn(
                  "px-4 py-3 text-left font-mono text-[11px] uppercase tracking-[0.14em]",
                  !ganaCompra ? "text-saffron-700" : "text-stone"
                )}
              >
                Alquilar {!ganaCompra && r.veredicto.banda !== "empate" && "· mayor patrimonio"}
              </th>
              <th
                className={cn(
                  "px-4 py-3 text-left font-mono text-[11px] uppercase tracking-[0.14em] sm:pr-8",
                  ganaCompra ? "text-saffron-700" : "text-stone"
                )}
              >
                Comprar {ganaCompra && r.veredicto.banda !== "empate" && "· mayor patrimonio"}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b border-hairline/60 last:border-b-0">
                <td className="px-6 py-3 align-top font-mono text-[10px] uppercase tracking-[0.1em] text-stone sm:px-8">
                  {row.label}
                </td>
                <td
                  className={cn(
                    "px-4 py-3 align-top tabular",
                    row.strong
                      ? cn("font-display text-xl leading-tight", !ganaCompra ? "text-saffron-700" : "text-ink")
                      : "text-ink-700"
                  )}
                >
                  {row.alquiler}
                </td>
                <td
                  className={cn(
                    "px-4 py-3 align-top tabular sm:pr-8",
                    row.strong
                      ? cn("font-display text-xl leading-tight", ganaCompra ? "text-saffron-700" : "text-ink")
                      : "text-ink-700"
                  )}
                >
                  {row.compra}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function FondoPerdido({ r }: { r: RentVsBuyResult }) {
  const N = r.inputs.horizonteAnios;
  const sellingCosts = (r.totales.costesVentaFinal ?? 0) + (r.totales.plusvaliaMunicipalFinal ?? 0) + (r.totales.impuestoVentaFinal ?? 0);
  const compraParts = [
    { label: "Intereses", value: r.totales.interesesTotales },
    { label: "Gastos recurrentes de propiedad", value: r.totales.tenenciaTotal },
    { label: "Compra y otros gastos iniciales", value: r.totales.gastosCompra + (r.totales.gastosInicialesCompra ?? 0) },
    { label: "Gastos de venta e impuestos", value: sellingCosts },
  ];
  const fondoCompra = compraParts.reduce((a, p) => a + p.value, 0);
  const fondoAlquiler = r.totales.rentaTotal + (r.totales.gastosInicialesAlquiler ?? 0) + (r.totales.segurosAlquilerTotal ?? 0) + (r.totales.gestionAlquilerTotal ?? 0);
  const max = Math.max(fondoCompra, fondoAlquiler, 1);

  const segColors = ["bg-ink-700", "bg-stone-500", "bg-saffron-300", "bg-clay-500"];

  return (
    <section className="rounded-2xl border border-hairline bg-paper-50 p-6 sm:p-8">
      <SectionHead
        eyebrow="El mito del dinero tirado"
        title={`Dinero que no recuperas en ${N} años`}
        sub="Suma de gastos nominales, sin descontar inflación. Incluye intereses y costes de una venta hipotética; la devolución del principal de la hipoteca no es un gasto perdido. Los impuestos de las carteras ya se descuentan del patrimonio y no se incluyen en estas barras."
      />

      <div className="mt-6 space-y-6">
        {/* Alquilar */}
        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink">Alquilar</span>
          </div>
          <div className="h-8 w-full rounded-md bg-paper-300">
            <div
              className="flex h-full min-w-fit items-center justify-end rounded-md bg-stone-600 px-2 text-paper-50 motion-safe:transition-[width] motion-safe:duration-500"
              style={{ width: `${(fondoAlquiler / max) * 100}%` }}
            >
              <span className="whitespace-nowrap font-mono text-xs tabular">{formatEUR(fondoAlquiler)}</span>
            </div>
          </div>
          <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-mist">
            Renta, seguro, otros costes e inversión inicial no recuperable
          </p>
        </div>

        {/* Comprar */}
        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink">Comprar</span>
            <span className="font-mono text-sm tabular text-ink">{formatEUR(fondoCompra)}</span>
          </div>
          <div className="flex h-7 w-full overflow-hidden rounded-md bg-paper-300" style={{ width: `${(fondoCompra / max) * 100}%` }}>
            {compraParts.map((p, i) => (
              <div
                key={p.label}
                className={cn("h-full transition-all duration-700 ease-editorial", segColors[i])}
                style={{ width: `${fondoCompra > 0 ? (p.value / fondoCompra) * 100 : 0}%` }}
                title={`${p.label}: ${formatEUR(p.value)}`}
              />
            ))}
          </div>
          <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5">
            {compraParts.map((p, i) => (
              <span key={p.label} className="inline-flex items-center gap-1.5 font-mono text-[10px] text-stone">
                <span className={cn("inline-block h-2 w-2 rounded-sm", segColors[i])} />
                {p.label} · {formatEUR(p.value, { compact: true })}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Avisos({ avisos }: { avisos: RentVsBuyAviso[] }) {
  if (avisos.length === 0) return null;
  const sesgoCls: Record<RentVsBuyAviso["sesgo"], string> = {
    pro_comprar: "border-l-saffron-300",
    pro_alquilar: "border-l-sage-500",
    neutral: "border-l-hairline-strong",
  };
  const sesgoLabel: Record<RentVsBuyAviso["sesgo"], string> = {
    pro_comprar: "favorece comprar",
    pro_alquilar: "favorece alquilar",
    neutral: "a tener en cuenta",
  };
  return (
    <section className="rounded-2xl border border-hairline bg-paper-50 p-6 sm:p-8">
      <SectionHead eyebrow="Tu vida, no solo tu dinero" title="Lo que el número no captura" />
      <ul className="mt-5 space-y-3">
        {avisos.map((a, i) => (
          <li
            key={i}
            className={cn(
              "flex items-start gap-3 rounded-lg border border-hairline border-l-2 bg-paper p-4",
              sesgoCls[a.sesgo]
            )}
          >
            <span className="mt-0.5 shrink-0 text-stone">
              {a.severidad === "info" ? (
                <Info size={16} weight="bold" />
              ) : (
                <Warning size={16} weight="fill" className={a.severidad === "fuerte" ? "text-saffron-700" : "text-stone"} />
              )}
            </span>
            <div>
              <p className="text-sm leading-relaxed text-ink-700">{a.mensaje}</p>
              <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.14em] text-mist">
                {sesgoLabel[a.sesgo]}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SensitivityCard({ input }: { input: RentVsBuyInput }) {
  return (
    <section className="rounded-2xl border border-hairline bg-paper-50 p-6 sm:p-8">
      <SectionHead
        eyebrow="Honestidad metodológica"
        title="El veredicto depende de tus supuestos"
        sub="Las filas cambian la rentabilidad anual de la cartera financiera. Las columnas cambian la revalorización anual de la vivienda. Cada casilla muestra cuánto patrimonio adicional tendría la opción indicada, manteniendo los demás supuestos."
      />
      <div className="mt-6">
        <SensitivityHeatmap input={input} />
      </div>
    </section>
  );
}

function AuditDetails({ r }: { r: RentVsBuyResult }) {
  const i = r.inputs;
  const supuestos: Array<[string, string]> = [
    ["Precio de la vivienda", formatEUR(i.precioVivienda)],
    ["Alquiler equivalente", `${formatEUR(i.alquilerMensual)}/mes`],
    ["Ahorro disponible", formatEUR(i.capitalDisponible)],
    ["Horizonte", `${i.horizonteAnios} años`],
    ["Entrada", `${i.entradaPorcentaje}% · ${formatEUR((i.precioVivienda * i.entradaPorcentaje) / 100)}`],
    ["Tipo de interés (fijo)", `${i.tipoInteres}%`],
    ["Plazo de la hipoteca", `${i.plazoHipotecaAnios} años`],
    ["Rentabilidad de la cartera", `${i.rentabilidadInversionAnual}%`],
    ["Revalorización de la vivienda", `${i.revalorizacionViviendaAnual}%`],
    ["Subida del alquiler", `${i.subidaAlquilerAnual}%`],
    ["Impuestos y trámites de compra", `${i.gastosCompraPorcentaje}%${i.esObraNueva ? " · obra nueva" : ""}`],
    ["Otros gastos iniciales de compra", formatEUR(i.gastosInicialesCompra ?? 0)],
    ["Otros gastos iniciales de alquiler", formatEUR(i.gastosInicialesAlquiler ?? 0)],
    ["Gestión / costes de propiedad anuales", formatEUR(i.gestionCompraAnual ?? 0)],
    ["Otros costes del inquilino anuales", formatEUR(i.gestionAlquilerAnual ?? 0)],
    ["Gastos de venta", `${i.gastosVentaPorcentaje}%`],
    ["IBI · comunidad · mantenimiento", `${formatEUR(i.ibiAnual)}/año · ${formatEUR(i.comunidadMensual)}/mes · ${i.mantenimientoPorcentaje}%`],
    ["Exención de ganancia simulada", i.viviendaHabitual && i.exencionGananciaVenta ? "Sí" : "No"],
    ["Inflación / costes", `${i.inflacionAnual}% · ${i.inflacionCostes}%`],
  ];

  return (
    <div className="space-y-4">
      <details className="group overflow-hidden rounded-xl border border-hairline bg-paper-50">
        <summary className="flex cursor-pointer select-none items-center justify-between p-5 font-mono text-[11px] uppercase tracking-[0.14em] text-saffron-700 transition hover:text-ink">
          <span>Ver supuestos del cálculo</span>
          <span className="text-mist transition group-open:rotate-180">▾</span>
        </summary>
        <div className="grid grid-cols-1 gap-x-8 gap-y-2.5 border-t border-hairline p-5 sm:grid-cols-2">
          {supuestos.map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between gap-4 border-b border-hairline/50 pb-2">
              <span className="text-sm text-stone-600">{k}</span>
              <span className="shrink-0 font-mono text-xs tabular text-ink">{v}</span>
            </div>
          ))}
        </div>
      </details>

      <details className="group overflow-hidden rounded-xl border border-hairline bg-paper-50">
        <summary className="flex cursor-pointer select-none items-center justify-between p-5 font-mono text-[11px] uppercase tracking-[0.14em] text-saffron-700 transition hover:text-ink">
          <span>Ver tabla año a año</span>
          <span className="text-mist transition group-open:rotate-180">▾</span>
        </summary>
        <p className="border-t border-hairline px-5 pt-4 text-xs text-stone-600">Patrimonios en {r.enReales ? "€ de hoy" : "€ nominales"}. Todas las demás columnas están en euros nominales del año correspondiente.</p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-right text-xs tabular">
            <thead>
              <tr className="border-b border-hairline font-mono text-[9px] uppercase tracking-[0.08em] text-stone">
                <th className="px-3 py-2 text-left font-medium">Año</th>
                <th className="px-3 py-2 font-medium">Intereses</th>
                <th className="px-3 py-2 font-medium">Principal</th>
                <th className="px-3 py-2 font-medium">Saldo</th>
                <th className="px-3 py-2 font-medium">Valor casa</th>
                <th className="px-3 py-2 font-medium">Vivienda neta</th>
                <th className="px-3 py-2 font-medium">Alquiler</th>
                <th className="px-3 py-2 font-medium">Patrim. comprar</th>
                <th className="px-3 py-2 font-medium">Patrim. alquilar</th>
              </tr>
            </thead>
            <tbody>
              {r.serie.map((d) => (
                <tr key={d.anio} className="border-b border-hairline/50 last:border-b-0">
                  <td className="px-3 py-1.5 text-left font-medium text-ink">{d.anio}</td>
                  <td className="px-3 py-1.5 text-stone-600">{formatEUR(d.interesesAnio, { compact: true })}</td>
                  <td className="px-3 py-1.5 text-stone-600">{formatEUR(d.principalAnio, { compact: true })}</td>
                  <td className="px-3 py-1.5 text-stone-600">{formatEUR(d.saldoVivo, { compact: true })}</td>
                  <td className="px-3 py-1.5 text-stone-600">{formatEUR(d.valorVivienda, { compact: true })}</td>
                  <td className="px-3 py-1.5 text-stone-600">{formatEUR(d.equityInmo, { compact: true })}</td>
                  <td className="px-3 py-1.5 text-stone-600">{formatEUR(d.alquilerAnual, { compact: true })}</td>
                  <td className="px-3 py-1.5 font-medium text-ink">{formatEUR(d.patrimonioCompra, { compact: true })}</td>
                  <td className="px-3 py-1.5 font-medium text-ink">{formatEUR(d.patrimonioAlquiler, { compact: true })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

function Disclaimer() {
  return (
    <p className="text-xs leading-relaxed text-mist">
      Herramienta orientativa, no es asesoramiento financiero ni fiscal. El
      resultado es muy sensible al diferencial entre la revalorización de la
      vivienda y la rentabilidad de tu cartera: pequeños cambios pueden invertir
      el veredicto. Las rentabilidades pasadas no garantizan las futuras y no se
      modela la volatilidad. Se mantiene la escala del ahorro del IRPF 2025 durante
      todo el horizonte, sin otras rentas o pérdidas compensables. El coste inicial
      excluye fianzas recuperables y valor residual de muebles. No se modelan mudanzas
      ni cambios de residencia fiscal. Impuestos y gastos son aproximaciones editables;
      consulta las fuentes del glosario y ajusta los valores a tu caso.
    </p>
  );
}

function AdvancedGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="group mt-5 border-t border-hairline pt-3">
      <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium leading-snug text-ink">
        {title}
      </summary>
      <div className="mt-3 space-y-4">{children}</div>
    </details>
  );
}

function Glossary() {
  const items: Array<[string, string]> = [
    ["Patrimonio neto", "Lo que conservarías al liquidar: valor de la vivienda menos deuda, gastos e impuestos de venta, más tu cartera de inversión. La entrada se convierte en vivienda; no se pierde como un gasto."],
    ["Cartera y coste de oportunidad", "La cartera es el dinero invertido en activos financieros. Usar ahorros para comprar una vivienda impide invertir esa parte. Ambos escenarios invierten lo que sobra, a la misma rentabilidad supuesta."],
    ["TIN, principal y cuota", "El TIN es el interés anual del préstamo, sin comisiones. La cuota devuelve principal (deuda) y paga intereses. Esta simulación usa interés fijo y amortización francesa; no representa una oferta bancaria ni calcula la TAE."],
    ["Precio / alquiler anual", "Precio de compra dividido por doce mensualidades de una vivienda equivalente. Un valor de ×20 significa que el precio equivale a 20 años de la renta actual, sin subidas ni gastos. No es una rentabilidad ni el año de equilibrio."],
    ["Punto de equilibrio", "Primer cierre anual o cruce interpolado en que comprar alcanza el patrimonio de alquilar. Puede cambiar después: el resultado principal siempre compara el último año elegido."],
    ["IBI, comunidad y mantenimiento", "El IBI se introduce por año; la comunidad, por mes. El mantenimiento parte del precio de compra, multiplicado por el porcentaje elegido, y crece con la inflación de gastos. El 1% es un ejemplo del modelo, sin validación empírica: sustituye esa cifra por un presupuesto realista de reparaciones."],
    ["Inflación y euros de hoy", "La inflación general convierte los patrimonios futuros a poder adquisitivo actual. La subida de gastos recurrentes actualiza IBI, comunidad, seguros, mantenimiento y otros costes. La vivienda y el alquiler tienen sus propias tasas separadas."],
    ["Otros gastos iniciales y gestión", "Se pagan una vez antes de invertir el capital restante. Muebles y mudanza tienen valor residual cero en el modelo; las fianzas recuperables se excluyen. La gestoría de compraventa está dentro del porcentaje de trámites; los servicios anuales se añaden aparte para evitar duplicarlos."],
  ];
  return (
    <details className="mt-5 rounded-xl border border-hairline bg-paper-50">
      <summary className="min-h-11 cursor-pointer px-4 py-3 text-sm font-medium text-ink">Glosario, impuestos y fuentes del cálculo</summary>
      <div className="space-y-5 border-t border-hairline p-4 text-sm leading-relaxed text-stone-600">
        <dl className="space-y-4">
          {items.map(([term, explanation]) => <div key={term}><dt className="font-medium text-ink">{term}</dt><dd className="mt-1">{explanation}</dd></div>)}
        </dl>
        <p><strong className="font-medium text-ink">Obra nueva e impuestos de compra.</strong> La primera entrega de vivienda nueva suele tributar al 10% de IVA, con supuestos especiales. La usada tributa por ITP; Madrid tiene un tipo general del 6% y posibles beneficios fiscales. El AJD depende de la operación y sus condiciones. El campo de impuestos y trámites ya contiene todos esos importes: el modelo no suma un segundo impuesto. Los ejemplos del 10% y 11,5% de gasto total no son tipos tributarios. <a className="underline underline-offset-2" href="https://sede.agenciatributaria.gob.es/Sede/iva/iva-operaciones-inmobiliarias/compro-vivienda-tengo-que-pagar-itp.html" target="_blank" rel="noreferrer">AEAT: IVA o ITP</a>; <a className="underline underline-offset-2" href="https://www.comunidad.madrid/atencion-contribuyente/transmisiones-patrimoniales-onerosas" target="_blank" rel="noreferrer">Madrid: ITP</a>; <a className="underline underline-offset-2" href="https://www.comunidad.madrid/atencion-contribuyente/actos-juridicos-documentados" target="_blank" rel="noreferrer">Madrid: AJD</a>.</p>
        <p><strong className="font-medium text-ink">Vivienda habitual y exención.</strong> Residir en la vivienda no basta por sí solo para eliminar el IRPF de una venta. La reinversión puede dar derecho a exención, total o proporcional, si se cumplen los requisitos y plazos; existen otros supuestos, como la transmisión de la vivienda habitual por mayores de 65 años. El interruptor simula una exención total sin comprobar si te corresponde. <a className="underline underline-offset-2" href="https://sede.agenciatributaria.gob.es/Sede/vivienda-otros-inmuebles/que-ocurre-cuando-vendo-inmueble/transmision-vivienda-habitual-reinversion.html" target="_blank" rel="noreferrer">AEAT: reinversión</a>; <a className="underline underline-offset-2" href="https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c11-ganancias-perdidas-patrimoniales/ganancias-excluidas-gravamen-supuestos-reinversion/transmision-vivienda-habitual-reinversion-importe/exencion.html" target="_blank" rel="noreferrer">AEAT: exenciones</a>.</p>
        <p><strong className="font-medium text-ink">Escala fiscal usada.</strong> El modelo mantiene la escala conjunta del ahorro del IRPF 2025 (19%, 21%, 23%, 27% y 30% por tramos). Al liquidar, suma las ganancias positivas de vivienda y cartera del comprador; no incorpora otras rentas, compensación de pérdidas ni mínimos personales. La plusvalía municipal es solo una aproximación editable, porque faltan los datos del suelo y del municipio. <a className="underline underline-offset-2" href="https://sede.agenciatributaria.gob.es/static_files/Sede/Actualidad/Notas_prensa/2026/PRESENTACION_CAMPANA_DE_RENTA_Y_PATRIMONIO_2025.pdf" target="_blank" rel="noreferrer">AEAT: Renta 2025</a>.</p>
        <p><strong className="font-medium text-ink">IBI y gastos del alquiler.</strong> El periodo del IBI es anual. En los arrendamientos de vivienda sujetos a la LAU, los costes de gestión inmobiliaria y formalización del contrato los asume el arrendador. El campo de otros costes del inquilino no debe trasladarle esos importes. <a className="underline underline-offset-2" href="https://www.boe.es/buscar/act.php?id=BOE-A-2004-4214#a75" target="_blank" rel="noreferrer">Haciendas Locales, art. 75</a>; <a className="underline underline-offset-2" href="https://www.boe.es/buscar/act.php?id=BOE-A-1994-26003#a20" target="_blank" rel="noreferrer">LAU, art. 20</a>.</p>
        <p className="text-xs text-mist">Fuentes consultadas el 9 de septiembre de 2026. Son referencias de los supuestos actuales, no una garantía de las normas o rentabilidades futuras.</p>
      </div>
    </details>
  );
}

/* ════════════════════════ Átomos de UI ════════════════════════ */

function SectionHead({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-2xl leading-tight text-ink sm:text-3xl">{title}</h2>
        <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-stone">
          {eyebrow}
        </span>
      </div>
      {sub && <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-stone-600">{sub}</p>}
    </div>
  );
}

function KPI({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-stone">{label}</p>
      <p className="mt-1 font-display text-lg leading-tight tabular text-ink">{value}</p>
    </div>
  );
}

function FieldSection({
  number,
  title,
  summary,
  description,
  defaultOpen = false,
  children,
}: {
  number: string;
  title: string;
  summary: string;
  description: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <details
      open={isOpen}
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
      className="group/field border-b border-hairline last:border-b-0"
    >
      <summary className="flex min-h-11 cursor-pointer list-none items-start gap-3 rounded-sm py-5 text-ink transition hover:text-saffron-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-saffron-700 [&::-webkit-details-marker]:hidden">
        <span aria-hidden="true" className="pt-1 font-mono text-[10px] tabular tracking-[0.1em] text-saffron-700">
          {number}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-medium leading-snug">{title}</span>
          <span className="mt-1 block text-xs leading-relaxed tabular text-stone-600">{summary}</span>
        </span>
        <CaretDown aria-hidden="true" size={16} className="mt-1 shrink-0 text-stone transition-transform group-open/field:rotate-180 motion-reduce:transition-none" />
      </summary>
      <div className="space-y-4 pb-6">
        <p className="text-xs leading-relaxed text-stone-600">{description}</p>
        {children}
      </div>
    </details>
  );
}

function Control({
  meta,
  input,
  set,
}: {
  meta: RentVsBuyField;
  input: RentVsBuyInput;
  set: (k: keyof RentVsBuyInput, v: number | boolean) => void;
}) {
  const value = input[meta.campo] ?? RENT_VS_BUY_DEFAULTS[meta.campo] ?? 0;
  if (meta.unidad === "boolean") {
    return (
      <ToggleField
        label={meta.etiqueta}
        nota={meta.nota}
        value={value as boolean}
        onChange={(b) => set(meta.campo, b)}
      />
    );
  }
  if (meta.unidad === "enum") {
    return (
      <ChoiceField
        label={meta.etiqueta}
        nota={meta.nota}
        value={value as number}
        opciones={meta.opciones ?? []}
        onChange={(n) => set(meta.campo, n)}
      />
    );
  }
  if (meta.unidad === "%" || meta.unidad === "años") {
    return (
      <SliderField meta={meta} value={value as number} onChange={(n) => set(meta.campo, n)} />
    );
  }
  return (
    <NumberField meta={meta} value={value as number} onChange={(n) => set(meta.campo, n)} />
  );
}

function FieldLabel({ label, nota, right }: { label: string; nota?: string; right?: React.ReactNode }) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between gap-3">
      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-stone" title={nota}>
        {label}
      </span>
      {right}
    </div>
  );
}

const unitSuffix = (u: RentVsBuyField["unidad"]) =>
  u === "EUR" ? "€" : u === "EUR/mes" ? "€/mes" : u === "EUR/año" ? "€/año" : "";

function NumberField({
  meta,
  value,
  onChange,
}: {
  meta: RentVsBuyField;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="block">
      <FieldLabel label={meta.etiqueta} />
      <div className="relative">
        <input
          inputMode="numeric"
          aria-label={meta.etiqueta}
          value={value ? formatNumber(value) : ""}
          onChange={(e) => onChange(Math.min(meta.max, Number(e.target.value.replace(/[^\d]/g, "")) || 0))}
          onBlur={() => onChange(Math.max(meta.min, Math.min(meta.max, value)))}
          className="w-full rounded-lg border border-hairline bg-paper-50 px-3.5 py-2.5 pr-16 font-mono text-sm tabular text-ink transition placeholder:text-mist focus:border-ink/40 focus:outline-none"
          placeholder="0"
        />
        <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 font-mono text-[11px] text-stone">
          {unitSuffix(meta.unidad)}
        </span>
      </div>
      {meta.nota && <p className="mt-1 text-[11px] leading-snug text-stone-600">{meta.nota}</p>}
    </label>
  );
}

function SliderField({
  meta,
  value,
  onChange,
}: {
  meta: RentVsBuyField;
  value: number;
  onChange: (n: number) => void;
}) {
  const suffix = meta.unidad === "%" ? "%" : meta.unidad === "años" ? " años" : "";
  const display = Number.isInteger(value) ? value : value.toFixed(1).replace(".", ",");
  return (
    <label className="block">
      <FieldLabel
        label={meta.etiqueta}
        nota={meta.nota}
        right={
          <span className="font-mono text-xs tabular text-ink">
            {display}
            {suffix}
          </span>
        }
      />
      <input
        type="range"
        aria-label={meta.etiqueta}
        min={meta.min}
        max={meta.max}
        step={meta.step ?? 1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="min-h-11 w-full cursor-pointer accent-saffron-500"
      />
      {meta.nota && <p className="mt-1 text-[11px] leading-snug text-stone-600">{meta.nota}</p>}
    </label>
  );
}

function ToggleField({
  label,
  nota,
  value,
  onChange,
}: {
  label: string;
  nota?: string;
  value: boolean;
  onChange: (b: boolean) => void;
}) {
  return (
    <div>
      <FieldLabel label={label} nota={nota} />
      <div className="flex gap-2" role="group" aria-label={label}>
        <Seg active={value} onClick={() => onChange(true)}>
          Sí
        </Seg>
        <Seg active={!value} onClick={() => onChange(false)}>
          No
        </Seg>
      </div>
      {nota && <p className="mt-1.5 text-[11px] leading-snug text-stone-600">{nota}</p>}
    </div>
  );
}

function ChoiceField({
  label,
  nota,
  value,
  opciones,
  onChange,
}: {
  label: string;
  nota?: string;
  value: number;
  opciones: string[];
  onChange: (n: number) => void;
}) {
  return (
    <div>
      <FieldLabel label={label} nota={nota} />
      <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
        {opciones.map((o, i) => (
          <Seg key={o} active={value === i} onClick={() => onChange(i)}>
            {o}
          </Seg>
        ))}
      </div>
      {nota && <p className="mt-1.5 text-[11px] leading-snug text-stone-600">{nota}</p>}
    </div>
  );
}

function Seg({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "min-h-11 rounded-lg border px-3 py-2 text-xs transition active:scale-[0.98]",
        active
          ? "border-ink bg-ink text-paper"
          : "border-hairline bg-paper-50 text-ink-700 hover:border-ink/30"
      )}
    >
      {children}
    </button>
  );
}
