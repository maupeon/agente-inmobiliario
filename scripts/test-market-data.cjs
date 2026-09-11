/** Regression cases reproduce the official INE/BdE payload formats, without network requests. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, extras = {}) {
  const output = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(code, { module: output, exports: output.exports, require: () => ({}), console, AbortSignal, TextDecoder, ...extras });
  return output.exports;
}

async function run() {
  const { parseBdeSeries } = load('lib/market/bde.ts');
  const codes = '"CÓDIGO DE LA SERIE",OTHER,DN_1TI2T0002,D_1NBAF472';
  const csv = [codes, '"JUL 2026",99,2.8926,2.855', '"AGO 2026",99,"_",2.954', '"JUN 2026",99,2.73,2.7', '"NOTAS","text, with comma","",""'].join('\n');
  assert.equal(JSON.stringify(parseBdeSeries(csv, 'DN_1TI2T0002')), JSON.stringify({ periodo: '2026-07', valor: 2.8926 }));
  assert.equal(JSON.stringify(parseBdeSeries(csv, 'D_1NBAF472')), JSON.stringify({ periodo: '2026-08', valor: 2.954 }));
  assert.equal(parseBdeSeries('<!DOCTYPE html><html>Unavailable</html>', 'DN_1TI2T0002'), null);
  assert.equal(parseBdeSeries(csv, 'UNKNOWN'), null);
  assert.equal(parseBdeSeries('"CÓDIGO DE LA SERIE",DUPLICATE,DUPLICATE\n"AGO 2026",2,3', 'DUPLICATE'), null);
  assert.equal(parseBdeSeries(`${codes}\n"AGO 2026",99,"",2.954`, 'DN_1TI2T0002'), null);

  const fallback = { fuente: 'fallback', serie: [] };
  const years = Array.from({length: 9},(_,i)=>2018+i);
  const points = years.flatMap(y=>Array.from({length: y===2026 ? 2 : 4},(_,i)=>({T3_Periodo:`T${i+1}`,Anyo:y,Valor:12.2}))).reverse();
  const payload = [
    {Nombre:'Andalucía. General. Variación anual. ',Data:[]},
    {Nombre:'Nacional. General. Variación anual. ',Data:points},
    {Nombre:'Nacional. General. Índice. ',Data:points.map((p,i)=>({...p,Valor:200-i}))},
    {Nombre:'Madrid, Comunidad de. Vivienda segunda mano. Índice. ',Data:points.map((p,i)=>({...p,Valor:220-i}))},
  ];
  const { fetchIneIpvQuarterly } = load('lib/market/ine.ts', {
    require: (id) => id === './fixtures' ? { FALLBACK_IPV: fallback } : {},
    fetch: async (url) => { assert.match(url, /DATOS_TABLA\/79563\?/); return { ok: true, json: async () => payload }; },
    console: { warn() {} },
  });
  const ipv = await fetchIneIpvQuarterly();
  assert.equal(ipv.schemaVersion,3);
  assert.equal(ipv.serie.length,34);
  assert.equal(ipv.serie[0].periodo,'2018T1');
  assert.equal(ipv.serie.at(-1).periodo,'2026T2');
  assert.equal(ipv.serie[0].variacionInteranual,12.2);
  assert.equal(ipv.base2018,168.5);
  assert.equal(ipv.madridSegundaMano.base2018,188.5);
  assert.equal(ipv.madridSegundaMano.serie.at(-1).periodo,"2026T2");
  payload[1].Data[0].T3_Periodo = 'invalid';
  assert.equal(await fetchIneIpvQuarterly(),fallback);
  payload[1].Data[0].T3_Periodo = 'T2';
  payload[2].Data.pop();
  assert.equal(await fetchIneIpvQuarterly(),fallback);
  const { formatMarketPeriod } = load('lib/market/presentation.ts');
  assert.equal(formatMarketPeriod('2025T1'), 'Q1 2025');
  assert.equal(formatMarketPeriod('2026Q4'), 'Q4 2026');
  assert.equal(formatMarketPeriod('2026-08'), '2026-08');
  console.log('PASS: market data — exact BdE series, per-series periods, missing/HTML/ambiguous data, INE T3_Periodo and chronology, quarter display.');
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
