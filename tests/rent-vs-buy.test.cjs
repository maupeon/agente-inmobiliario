/* Financial regression checks: deterministic, no network, no credentials. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const source = fs.readFileSync(path.join(__dirname, "../lib/finance/rent-vs-buy.ts"), "utf8");
const mod = { exports: {} };
vm.runInNewContext(ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { module: mod, exports: mod.exports, Intl });
const { runCompararAlquilerCompra: run, RENT_VS_BUY_FIELDS: fields } = mod.exports;
let passed = 0;
const check = (name, fn) => { fn(); passed++; console.log(`PASS ${name}`); };
const near = (actual, expected, tolerance = 1) => assert(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);

const base = {
  precioVivienda: 100000, capitalDisponible: 200000, alquilerMensual: 1000,
  horizonteAnios: 1, entradaPorcentaje: 100, gastosCompraPorcentaje: 0,
  gastosVentaPorcentaje: 0, plusvaliaMunicipalPorcentaje: 0,
  tipoInteres: 0, rentabilidadInversionAnual: 0, revalorizacionViviendaAnual: 0,
  inflacionAnual: 0, inflacionCostes: 0, subidaAlquilerAnual: 0,
  ibiAnual: 0, comunidadMensual: 0, seguroHogarAnual: 0, mantenimientoPorcentaje: 0,
  mostrarEnReales: false, liquidarCarteraAlFinal: true,
};

check("same initial wealth and housing budget in a hand-calculable scenario", () => {
  const r = run(base);
  assert.equal(r.patrimonioFinalCompra, 212000);
  assert.equal(r.patrimonioFinalAlquiler, 200000);
  assert.equal(r.serie[0].aporteCompra, 12000);
  assert.equal(r.serie[0].aporteAlquiler, 0);
});
check("initial costs charged once to the correct option, without inflating tax basis", () => {
  const r = run({ ...base, gastosInicialesCompra: 10000, gastosInicialesAlquiler: 5000 });
  assert.equal(r.desembolsoInicialCompra, 110000);
  assert.equal(r.patrimonioFinalCompra, 202000);
  assert.equal(r.patrimonioFinalAlquiler, 195000);
  const a = run({ ...base, revalorizacionViviendaAnual: 10 });
  const b = run({ ...base, revalorizacionViviendaAnual: 10, gastosInicialesCompra: 10000 });
  assert.equal(a.totales.impuestoVentaFinal, b.totales.impuestoVentaFinal);
});
check("new construction respects the explicit total without hidden tax or floor", () => {
  const r = run({ ...base, esObraNueva: true, gastosCompraPorcentaje: 8 });
  assert.equal(r.inputs.gastosCompraPorcentaje, 8);
  assert.equal(r.totales.gastosCompra, 8000);
  assert.equal(r.desembolsoInicialCompra, 108000);
  const defaults = run({ esObraNueva: true });
  assert.equal(defaults.inputs.gastosCompraPorcentaje, 11.5);
});
check("maintenance and management follow recurring-cost inflation, not house appreciation", () => {
  const r = run({ ...base, horizonteAnios: 2, mantenimientoPorcentaje: 1, gestionCompraAnual: 100,
    gestionAlquilerAnual: 200, seguroInquilinoAnual: 50, inflacionCostes: 2, revalorizacionViviendaAnual: 12 });
  assert.equal(r.serie[0].costesTenencia, 1100);
  assert.equal(r.serie[1].costesTenencia, 1122);
  assert.equal(r.totales.gestionAlquilerTotal, 404);
  assert.equal(r.totales.segurosAlquilerTotal, 101);
  assert.equal(r.serie[0].aporteCompra, 11150);
});
check("initial purchase costs reduce affordable price and reveal insufficient cash", () => {
  const r = run({ ...base, capitalDisponible: 105000, gastosInicialesCompra: 10000 });
  assert.equal(r.feasible, false);
  assert.equal(r.precioMaxFinanciable, 95000);
  assert(r.avisos.some(a => a.clave === "entrada_insuficiente"));
  const rent = run({ ...base, gastosInicialesAlquiler: 300000 });
  assert(rent.avisos.some(a => a.clave === "liquidez" && a.severidad === "fuerte"));
  const fullyFinanced = run({ ...base, entradaPorcentaje: 0, capitalDisponible: 0 });
  assert.equal(fullyFinanced.precioMaxFinanciable, 3000000); // Input limit, no upfront percentage.
  const fixedCostDeficit = run({ ...base, entradaPorcentaje: 0, capitalDisponible: 0, gastosInicialesCompra: 1000 });
  assert.equal(fixedCostDeficit.precioMaxFinanciable, 0);
});
check("zero-interest mortgage amortizes fully with no residual payments after term", () => {
  const r = run({ ...base, entradaPorcentaje: 20, plazoHipotecaAnios: 5, horizonteAnios: 6 });
  near(r.totales.principalTotal, 80000);
  assert.equal(r.totales.interesesTotales, 0);
  assert.equal(r.serie[4].saldoVivo, 0);
  assert.equal(r.serie[5].cuotaAnual, 0);
});
check("2025 savings tax applies 30% only to gains above 300000 euros", () => {
  const r = run({ ...base, capitalDisponible: 4500000, rentabilidadInversionAnual: 12 });
  // 540000 gain: 1140 + 9240 + 34500 + 27000 + 72000 = 143880 tax.
  assert.equal(r.patrimonioFinalAlquiler, 5040000 - 143880);
});
check("buyer house and portfolio gains share a single progressive tax scale", () => {
  const r = run({ ...base, revalorizacionViviendaAnual: 10, rentabilidadInversionAnual: 12 });
  // House 110000 + portfolio (100000 * 1.12 + 12000), gains 22000, tax 4500.
  assert.equal(r.patrimonioFinalCompra, 229500);
});
check("municipal disposal tax reduces the taxable gain and is included in liquidation", () => {
  const r = run({ ...base, revalorizacionViviendaAnual: 10, plusvaliaMunicipalPorcentaje: 1 });
  assert.equal(r.totales.plusvaliaMunicipalFinal, 1100);
  assert.equal(r.totales.impuestoVentaFinal, 1749);
  assert.equal(r.serie[0].equityInmo, 107151);
});
check("habitual residence does not activate exemption by itself", () => {
  const r = run({ ...base, revalorizacionViviendaAnual: 10 });
  const ordinary = run({ ...base, revalorizacionViviendaAnual: 10, viviendaHabitual: false });
  const exempt = run({ ...base, revalorizacionViviendaAnual: 10, exencionGananciaVenta: true });
  assert.equal(r.patrimonioFinalCompra, ordinary.patrimonioFinalCompra);
  assert(exempt.patrimonioFinalCompra > r.patrimonioFinalCompra);
});
check("legacy relocation inputs do not silently manufacture rent or foreign tax", () => {
  const a = run({ ...base, horizonteAnios: 5 });
  const b = run({ ...base, horizonteAnios: 5, aniosHastaMudanza: 1, escenarioMudanza: 1, paisDestinoFueraUE: true });
  assert.equal(a.patrimonioFinalCompra, b.patrimonioFinalCompra);
  assert.equal(b.totales.irnrAcumulado, 0);
  assert(b.avisos.some(a => a.mensaje.includes("no ejecuta una venta intermedia")));
});
check("salary increase accepts 300% total and affects advice, never simulated wealth", () => {
  const r = run({ ...base, crecimientoSalarialEsperado: 300 });
  assert.equal(fields.find(f => f.campo === "crecimientoSalarialEsperado").max, 300);
  assert.equal(r.inputs.crecimientoSalarialEsperado, 300);
  assert.equal(r.patrimonioFinalCompra, run(base).patrimonioFinalCompra);
});
check("real and nominal wealth use the same deflator and winner", () => {
  const args = { ...base, horizonteAnios: 10, inflacionAnual: 3, revalorizacionViviendaAnual: 4, rentabilidadInversionAnual: 7 };
  const a = run(args), b = run({ ...args, mostrarEnReales: true });
  near(b.patrimonioFinalCompra, a.patrimonioFinalCompra / Math.pow(1.03, 10));
  near(b.patrimonioFinalAlquiler, a.patrimonioFinalAlquiler / Math.pow(1.03, 10));
  assert.equal(a.veredicto.ganador, b.veredicto.ganador);
});
check("first annual observation is never mislabeled as a crossing at time zero", () => {
  assert.equal(run(base).breakEvenAnios, 1);
});
check("324 varied scenarios remain finite and agree with final wealth", () => {
  for (const price of [150000, 300000, 600000]) for (const rent of [700, 1200, 2200])
  for (const house of [-3, 0, 2, 4]) for (const portfolio of [4, 8, 12]) for (const years of [10, 20, 40]) {
    const r = run({ precioVivienda: price, alquilerMensual: rent, revalorizacionViviendaAnual: house,
      rentabilidadInversionAnual: portfolio, horizonteAnios: years, capitalDisponible: 200000,
      gastosInicialesCompra: 8000, gastosInicialesAlquiler: 1500, gestionCompraAnual: 150,
      gestionAlquilerAnual: 100, subidaAlquilerAnual: 0 });
    assert.equal(r.veredicto.ganador, r.ventajaCompra >= 0 ? "comprar" : "alquilar");
    assert(r.serie.every(row => Object.values(row).every(Number.isFinite)));
    assert(r.serie.every(row => row.saldoVivo >= 0));
  }
});
console.log(`\n${passed} financial regression groups passed.`);
