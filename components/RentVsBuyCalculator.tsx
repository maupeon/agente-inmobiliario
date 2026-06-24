"use client";
import { useMemo, useState } from "react";
import { Warning, Info, Scales } from "@phosphor-icons/react";
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

const SEC_PARTIDA: Array<keyof RentVsBuyInput> = [
  "precioVivienda",
  "alquilerMensual",
  "capitalDisponible",
  "horizonteAnios",
];
const SEC_HIPOTECA: Array<keyof RentVsBuyInput> = [
  "entradaPorcentaje",
  "tipoInteres",
  "plazoHipotecaAnios",
];
const SEC_SUPUESTOS: Array<keyof RentVsBuyInput> = [
  "rentabilidadInversionAnual",
  "revalorizacionViviendaAnual",
  "subidaAlquilerAnual",
];
const SEC_PERSONAL: Array<keyof RentVsBuyInput> = [
  "probMudanzaExtranjero",
  "estabilidadLaboral",
  "liquidezNecesaria",
];

const GRUPO_LABEL: Record<string, string> = {
  compra: "La compra",
  alquiler: "El alquiler",
  comun: "Comunes",
  personal: "Tu situación",
};

export function RentVsBuyCalculator() {
  const [input, setInput] = useState<RentVsBuyInput>(RENT_VS_BUY_DEFAULTS);
  const result = useMemo(() => runCompararAlquilerCompra(input), [input]);

  const setRaw = (k: keyof RentVsBuyInput, v: number | boolean) =>
    setInput((s) => ({ ...s, [k]: v } as RentVsBuyInput));

  const reset = () => setInput(RENT_VS_BUY_DEFAULTS);

  const advanced = RENT_VS_BUY_FIELDS.filter((f) => f.avanzado);
  const advByGroup = (g: string) => advanced.filter((f) => f.grupo === g);

  return (
    <main className="mx-auto w-full max-w-[1200px] px-5 pb-24 pt-10 sm:px-8">
      <div className="flex items-center justify-between gap-4 border-y border-ink py-2.5 font-mono text-[10px] uppercase tracking-[0.22em] text-ink">
        <span>Comprar o alquilar</span>
        <span className="hidden sm:inline">Calculadora de patrimonio</span>
        <span className="tabular text-stone">№ 004</span>
      </div>

      <header className="mt-10 max-w-[64ch]">
        <h1 className="font-display text-display-md text-ink text-balance">
          ¿Te conviene comprar, o alquilar e invertir?
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-stone-600">
          No comparamos solo cuotas frente a renta. Simulamos, año a año, qué
          opción te deja <strong className="font-medium text-ink">más patrimonio</strong> a
          largo plazo —contando el coste de oportunidad de invertir tu capital,
          la revalorización de la vivienda, los impuestos y tus planes de futuro.
        </p>
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
              className="font-mono text-[10px] uppercase tracking-[0.14em] text-stone transition hover:text-ink"
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

          <FieldSection title="Punto de partida">
            {SEC_PARTIDA.map((c) => (
              <Control key={c} meta={field(c)} input={input} set={setRaw} />
            ))}
          </FieldSection>

          <FieldSection title="La hipoteca">
            {SEC_HIPOTECA.map((c) => (
              <Control key={c} meta={field(c)} input={input} set={setRaw} />
            ))}
          </FieldSection>

          <FieldSection title="Tus supuestos a largo plazo">
            {SEC_SUPUESTOS.map((c) => (
              <Control key={c} meta={field(c)} input={input} set={setRaw} />
            ))}
          </FieldSection>

          <FieldSection title="Tu situación personal">
            {SEC_PERSONAL.map((c) => (
              <Control key={c} meta={field(c)} input={input} set={setRaw} />
            ))}
          </FieldSection>

          <details className="group mt-5 border-t border-hairline pt-4">
            <summary className="cursor-pointer select-none font-mono text-[11px] uppercase tracking-[0.16em] text-saffron-700 transition hover:text-ink">
              <span className="group-open:hidden">▸ Ajustes avanzados</span>
              <span className="hidden group-open:inline">▾ Ocultar avanzados</span>
            </summary>
            <div className="mt-4 space-y-6">
              {["compra", "alquiler", "personal", "comun"].map((g) => (
                <div key={g}>
                  <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-stone">
                    {GRUPO_LABEL[g]}
                  </p>
                  <div className="space-y-4">
                    {advByGroup(g).map((f) => (
                      <Control key={String(f.campo)} meta={f} input={input} set={setRaw} />
                    ))}
                    {g === "personal" && (
                      <ChoiceField
                        label="Si te mudas, ¿qué harías?"
                        nota="Vender implica gastos de venta; alquilar a distancia tributa por IRNR."
                        value={input.escenarioMudanza}
                        opciones={["Vender", "Alquilarlo a distancia"]}
                        onChange={(n) => setRaw("escenarioMudanza", n)}
                      />
                    )}
                  </div>
                </div>
              ))}

              <div>
                <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-stone">
                  Cómo mostrar los resultados
                </p>
                <div className="space-y-4">
                  <ToggleField
                    label="Patrimonio en € de hoy"
                    nota="Deflacta por la inflación para comparar en poder adquisitivo actual."
                    value={input.mostrarEnReales}
                    onChange={(b) => setRaw("mostrarEnReales", b)}
                  />
                  <ToggleField
                    label="Descontar impuestos al liquidar"
                    nota="Aplica el impuesto del ahorro a la plusvalía de ambas carteras (comparación justa)."
                    value={input.liquidarCarteraAlFinal}
                    onChange={(b) => setRaw("liquidarCarteraAlFinal", b)}
                  />
                </div>
              </div>
            </div>
          </details>
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
          label="Precio / alquiler anual"
          value={r.priceToRent != null ? `×${String(r.priceToRent).replace(".", ",")}` : "—"}
        />
      </div>
    </section>
  );
}

function ChartCard({ r }: { r: RentVsBuyResult }) {
  return (
    <section className="rounded-2xl border border-hairline bg-paper-50 p-6 sm:p-8">
      <SectionHead
        eyebrow="La película"
        title="Cómo evoluciona tu patrimonio"
        sub="La línea de compra arranca por debajo (entrada y gastos) y, si cruza, te adelanta a partir del año de equilibrio."
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
  const valorFinal = last?.valorVivienda ?? 0;
  const sellingCosts = Math.round(
    (valorFinal * r.inputs.gastosVentaPorcentaje) / 100 +
      (valorFinal > r.inputs.precioVivienda
        ? (valorFinal * r.inputs.plusvaliaMunicipalPorcentaje) / 100
        : 0)
  );
  const fondoCompra =
    r.totales.interesesTotales + r.totales.tenenciaTotal + r.totales.gastosCompra + sellingCosts;
  const colchon = Math.max(r.inputs.capitalDisponible - r.desembolsoInicialCompra, 0);
  const aporteCompra = Math.round(r.serie.reduce((a, d) => a + d.aporteCompra, 0) / N);
  const aporteAlquiler = Math.round(r.serie.reduce((a, d) => a + d.aporteAlquiler, 0) / N);
  const ganaCompra = r.veredicto.ganador === "comprar";

  const movilidadCompra = r.inputs.paisDestinoFueraUE
    ? "Limitada · IRNR 24% si la alquilas fuera de la UE"
    : "Limitada · gestión a distancia";

  const rows: Array<{ label: string; alquiler: string; compra: string; strong?: boolean }> = [
    {
      label: `Patrimonio a ${N} años`,
      alquiler: formatEUR(r.patrimonioFinalAlquiler),
      compra: formatEUR(r.patrimonioFinalCompra),
      strong: true,
    },
    {
      label: "Fondo perdido (no vuelve)",
      alquiler: formatEUR(r.totales.rentaTotal),
      compra: formatEUR(fondoCompra),
    },
    {
      label: "Lo que construyes",
      alquiler: `${formatEUR(last?.carteraAlquiler ?? 0)} en cartera`,
      compra: `${formatEUR(last?.equityInmo ?? 0)} en vivienda`,
    },
    {
      label: "Inviertes de media / año",
      alquiler: `${formatEUR(aporteAlquiler)}`,
      compra: `${formatEUR(aporteCompra)}`,
    },
    {
      label: "Liquidez",
      alquiler: "Casi total (cartera vendible)",
      compra: colchon > 0 ? `${formatEUR(colchon)} de colchón` : "Casi nula",
    },
    {
      label: "Movilidad",
      alquiler: "Alta · te puedes mover",
      compra: movilidadCompra,
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
                Alquilar {!ganaCompra && "· gana"}
              </th>
              <th
                className={cn(
                  "px-4 py-3 text-left font-mono text-[11px] uppercase tracking-[0.14em] sm:pr-8",
                  ganaCompra ? "text-saffron-700" : "text-stone"
                )}
              >
                Comprar {ganaCompra && "· gana"}
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
  const last = r.serie[r.serie.length - 1];
  const valorFinal = last?.valorVivienda ?? 0;
  const sellingCosts = Math.round(
    (valorFinal * r.inputs.gastosVentaPorcentaje) / 100 +
      (valorFinal > r.inputs.precioVivienda
        ? (valorFinal * r.inputs.plusvaliaMunicipalPorcentaje) / 100
        : 0)
  );
  const compraParts = [
    { label: "Intereses", value: r.totales.interesesTotales },
    { label: "IBI, comunidad, seguro y mantenimiento", value: r.totales.tenenciaTotal },
    { label: "Gastos de compra", value: r.totales.gastosCompra },
    { label: "Gastos de venta e impuestos", value: sellingCosts },
  ];
  const fondoCompra = compraParts.reduce((a, p) => a + p.value, 0);
  const fondoAlquiler = r.totales.rentaTotal;
  const max = Math.max(fondoCompra, fondoAlquiler, 1);

  const segColors = ["bg-ink-700", "bg-stone-500", "bg-saffron-300", "bg-clay-500"];

  return (
    <section className="rounded-2xl border border-hairline bg-paper-50 p-6 sm:p-8">
      <SectionHead
        eyebrow="El mito del dinero tirado"
        title={`Dinero que no recuperas en ${N} años`}
        sub="Comprar también tiene un fondo perdido grande (intereses, gastos e impuestos). La diferencia es que, al alquilar, tu capital sigue invertido."
      />

      <div className="mt-6 space-y-6">
        {/* Alquilar */}
        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink">Alquilar</span>
            <span className="font-mono text-sm tabular text-ink">{formatEUR(fondoAlquiler)}</span>
          </div>
          <div className="h-7 w-full overflow-hidden rounded-md bg-paper-300">
            <div
              className="h-full rounded-md bg-stone-500 transition-all duration-700 ease-editorial"
              style={{ width: `${(fondoAlquiler / max) * 100}%` }}
            />
          </div>
          <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-mist">
            Toda la renta pagada
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
                style={{ width: `${(p.value / fondoCompra) * 100}%` }}
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
        sub="Cuánto rinda tu cartera frente a cuánto se revalorice la vivienda lo cambia todo. Aquí ves quién gana en cada combinación; tu escenario va marcado."
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
    ["Gastos de compra", `${i.gastosCompraPorcentaje}%${i.esObraNueva ? " · obra nueva" : ""}`],
    ["Gastos de venta", `${i.gastosVentaPorcentaje}%`],
    ["IBI · comunidad · mantenimiento", `${formatEUR(i.ibiAnual)} · ${formatEUR(i.comunidadMensual)}/mes · ${i.mantenimientoPorcentaje}%`],
    ["Vivienda habitual (exención)", i.viviendaHabitual ? "Sí" : "No"],
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
        <div className="overflow-x-auto border-t border-hairline">
          <table className="w-full border-collapse text-right text-xs tabular">
            <thead>
              <tr className="border-b border-hairline font-mono text-[9px] uppercase tracking-[0.08em] text-stone">
                <th className="px-3 py-2 text-left font-medium">Año</th>
                <th className="px-3 py-2 font-medium">Intereses</th>
                <th className="px-3 py-2 font-medium">Principal</th>
                <th className="px-3 py-2 font-medium">Saldo</th>
                <th className="px-3 py-2 font-medium">Valor casa</th>
                <th className="px-3 py-2 font-medium">Equity</th>
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
      modela la volatilidad. Impuestos y costes son estimaciones para Madrid
      (ITP/IVA, IBI, plusvalía municipal e IRNR aproximados). Ajusta los valores
      a tu caso real antes de decidir.
    </p>
  );
}

/* ════════════════════════ Átomos de UI ════════════════════════ */

function SectionHead({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
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

function FieldSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-saffron-700">
        {title}
      </p>
      <div className="space-y-4">{children}</div>
    </div>
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
  const value = input[meta.campo];
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
          value={value ? formatNumber(value) : ""}
          onChange={(e) => onChange(Number(e.target.value.replace(/[^\d]/g, "")) || 0)}
          className="w-full rounded-lg border border-hairline bg-paper-50 px-3.5 py-2.5 pr-16 font-mono text-sm tabular text-ink transition placeholder:text-mist focus:border-ink/40 focus:outline-none"
          placeholder="0"
        />
        <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 font-mono text-[11px] text-stone">
          {unitSuffix(meta.unidad)}
        </span>
      </div>
      {meta.nota && <p className="mt-1 text-[11px] leading-snug text-mist">{meta.nota}</p>}
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
        className="w-full cursor-pointer accent-saffron-500"
      />
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
      <div className="flex gap-2">
        <Seg active={value} onClick={() => onChange(true)}>
          Sí
        </Seg>
        <Seg active={!value} onClick={() => onChange(false)}>
          No
        </Seg>
      </div>
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
      <div className="flex flex-wrap gap-2">
        {opciones.map((o, i) => (
          <Seg key={o} active={value === i} onClick={() => onChange(i)}>
            {o}
          </Seg>
        ))}
      </div>
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
      onClick={onClick}
      className={cn(
        "rounded-lg border px-3 py-2 text-xs transition active:scale-[0.98]",
        active
          ? "border-ink bg-ink text-paper"
          : "border-hairline bg-paper-50 text-ink-700 hover:border-ink/30"
      )}
    >
      {children}
    </button>
  );
}
