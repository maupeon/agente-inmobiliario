const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const test = require('node:test');
const ts = require('typescript');
const { anuncio, respuesta } = require('./fixtures/valoracion-v3.json');
const root = path.resolve(__dirname, '..');

function loader(response = respuesta, stubs = {}, capture = () => {}) {
  const cache = new Map();
  return function load(file) {
    file = path.isAbsolute(file) ? file : path.join(root, file);
    if (!fs.existsSync(file)) file += '.ts';
    if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.ts');
    if (cache.has(file)) return cache.get(file).exports;
    const mod = { exports: {} }; cache.set(file, mod);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }, fileName: file,
    }).outputText;
    const localRequire = id => Object.hasOwn(stubs, id) ? stubs[id] : id === 'server-only' ? {}
      : id.startsWith('@/') ? load(id.slice(2)) : id.startsWith('.') ? load(path.resolve(path.dirname(file), id)) : require(id);
    vm.runInNewContext(code, { module: mod, exports: mod.exports, require: localRequire,
      console, process: { env: { VALORACION_URL: 'http://synthetic.invalid' } },
      Buffer, URL, Response, Request, AbortSignal, setTimeout, clearTimeout,
      fetch: async (url, options) => { capture(JSON.parse(options.body)); return Response.json(response); },
    }, { filename: file });
    return mod.exports;
  };
}

test('real v3 HTTP fixture retains observed input and point estimate without inventing bands', async () => {
  let posted;
  const load = loader(respuesta, {}, data => { posted = data; });
  const batch = await load('lib/valoracion/client.ts').valorarLoteConEstado([anuncio]);
  assert.equal(batch.resultados.size, 1);
  const value = batch.resultados.get(anuncio.propertyCode);
  assert.equal(value.intervalo, null);
  assert.equal(value.banda, null);
  assert.equal(value.nivel_precios, '2025');
  assert.equal(posted.anuncios[0].description, anuncio.description);
  assert.equal(posted.anuncios[0].parkingSpace.hasParkingSpace, true);
  assert.equal(posted.anuncios[0].operation, 'sale');
});

test('v3 rejects forged periods, intervals, model identities, rental claims and inconsistent arithmetic', async () => {
  for (const changed of [{ model_id: 'habitIA-oferta-2018-v2' }, { nivel_precios: '2026T1' },
    { model_version: '2.0.0' }, { intervalo: [300000, 700000] }, { banda: 'barato' },
    { oportunidad: true }, { alquiler_validado: true }, { ano_renta: 2026 },
    { precio_estimado: 100 }, { brecha_pct: -99 }, { renta_mensual_estimada: 1 },
    { modelo_sha256: '' }, { calidad: {} }, { propertyCode: 'unsolicited' }]) {
    const load = loader({ ...respuesta, resultados: [{ ...respuesta.resultados[0], ...changed }] });
    const batch = await load('lib/valoracion/client.ts').valorarLoteConEstado([anuncio]);
    assert.equal(batch.resultados.size, 0, JSON.stringify(changed));
  }
});

test('mixed v3 results retain abstentions and reject duplicate or mismatched envelopes', async () => {
  const error = { propertyCode: 'large', indice: 1, estado: 'fuera_ambito', detalle: 'Superficie superior a 367 m²' };
  const load = loader({ ...respuesta, errores: [error] });
  const batch = await load('lib/valoracion/client.ts').valorarLoteConEstado([anuncio, { ...anuncio, propertyCode: 'large', size: 400 }]);
  assert.equal(batch.resultados.size, 1);
  assert.equal(batch.estados.get('large').estado, 'fuera_ambito');
  for (const body of [{ ...respuesta, resultados: [respuesta.resultados[0], respuesta.resultados[0]] },
    { ...respuesta, model_id: 'unknown' }, { ...respuesta, nivel_precios: '2026' }]) {
    assert.equal((await loader(body)('lib/valoracion/client.ts').valorarLoteConEstado([anuncio])).resultados.size, 0);
  }
});

test('enrichment and scoring expose a point estimate, warnings and rental scenario without Fair points', async () => {
  const value = respuesta.resultados[0];
  const stubs = {
    '@/lib/market/cache': { getMarketData: async () => ({ data: { data: [] }, fromFallback: true }) },
    '@/lib/market/match-province': { findProvincePrice: () => null },
    '@/lib/market/rent': { findRentReference: () => null },
  };
  const load = loader(respuesta, stubs);
  const [enriched] = await load('lib/enrich.ts').enrichProperties([anuncio]);
  assert.equal(enriched.valuation.precioEstimado, value.precio_estimado);
  assert.equal(enriched.valuation.intervalo, undefined);
  assert.equal(enriched.valuation.rentaEscenario.ano, 2024);
  assert(enriched.valuation.advertencias.length > 0);
  const format = load('lib/dashboard-format.ts');
  assert.equal(format.priceLabel(enriched.valuation), null);
  assert(format.priceComparison(enriched.valuation).includes('por debajo'));
  const score = load('lib/personal-score.ts').personalScore(anuncio, enriched, null);
  assert.equal(score.scoring.components.find(c => c.key === 'fair').value, null);
  assert(score.scoring.components[0].explanation.includes('XGBoost'));
});

test('Idealista normalizer and chat tool preserve description and structured parking', async () => {
  let observed;
  const load = loader(respuesta, {
    '@/lib/valoracion/client': { valorarLoteConEstado: async ps => {
      observed = ps[0]; return { resultados: new Map(), estados: new Map() };
    } },
  });
  const normalized = load('lib/idealista/search.ts').normalizeProperty(anuncio, 'venta');
  assert.equal(normalized.description, anuncio.description);
  assert.equal(normalized.parkingSpace.hasParkingSpace, true);
  await load('lib/agent/tools/valorar-vivienda.ts').runValorarVivienda(normalized);
  assert.equal(observed.description, anuncio.description);
  assert.equal(observed.parkingSpace.hasParkingSpace, true);
});
