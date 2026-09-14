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

test('enrichment and scoring expose a point estimate, warnings and rental scenario with Fair derived from comparable prices', async () => {
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
  assert.equal(score.scoring.components.find(c => c.key === 'fair').value, Math.round(Math.min(100,Math.max(0,50 - 2.5 * value.brecha_pct))*10)/10);
  assert(score.scoring.components[0].explanation.includes('Regla provisional'));
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

const mixed = require('./fixtures/valoracion-v3-mixed.json');
test('v3.1 compares sale totals and monthly rent in the same HTTP batch', async () => {
  let posted;
  const load = loader(mixed.respuesta, {}, data => { posted = data; });
  const batch = await load('lib/valoracion/client.ts').valorarLoteConEstado(mixed.anuncios);
  assert.equal(batch.resultados.size, 2);
  assert.equal(posted.anuncios[1].operation, 'rent');
  assert.equal(posted.anuncios[1].price, 1500);
  const rent = batch.resultados.get(mixed.anuncios[1].propertyCode);
  assert.equal(rent.unidad_comparacion, 'EUR/mes');
  assert.equal(load('lib/valoracion/types.ts').precioEstimado(rent), rent.renta_mensual_estimada);
  assert.equal(rent.precio_estimado, mixed.respuesta.resultados[0].precio_estimado);
  assert(Math.abs(rent.brecha_pct) < 1);
});

test('rent rejects sale responses, incompatible units and inconsistent comparison amounts', async () => {
  const rental = mixed.anuncios[1];
  for (const changed of [{ operation: 'sale' }, { unidad_comparacion: 'EUR' },
    { precio_comparacion: mixed.respuesta.resultados[1].precio_estimado },
    { brecha_pct: (1500 / mixed.respuesta.resultados[1].precio_estimado - 1) * 100 }]) {
    const response = { ...mixed.respuesta, resultados: [{ ...mixed.respuesta.resultados[1], ...changed }] };
    assert.equal((await loader(response)('lib/valoracion/client.ts').valorarLoteConEstado([rental])).resultados.size, 0);
  }
  // Even an internally coherent sale response must not be used for a rental request.
  for (const response of [respuesta, mixed.respuesta]) {
    const body = { ...response, resultados: [{ ...response.resultados[0], propertyCode: rental.propertyCode }] };
    assert.equal((await loader(body)('lib/valoracion/client.ts').valorarLoteConEstado([rental])).resultados.size, 0);
  }
});

test('rental enrichment uses monthly rent per square metre and explicit derivation with Fair derived from comparable prices', async () => {
  const load = loader(mixed.respuesta, {
    '@/lib/market/cache': { getMarketData: async () => ({ data: { data: [] }, fromFallback: true }) },
    '@/lib/market/match-province': { findProvincePrice: () => null },
    '@/lib/market/rent': { findRentReference: () => null },
  });
  const [sale, rent] = await load('lib/enrich.ts').enrichProperties(mixed.anuncios);
  assert.equal(sale.valuation.operacion, 'venta');
  assert.equal(rent.valuation.operacion, 'alquiler');
  assert.equal(rent.valuation.precioEstimado, mixed.respuesta.resultados[1].renta_mensual_estimada);
  assert.equal(rent.valuation.referenciaEurM2, 18.8);
  assert(rent.valuation.avisoModelo.includes('2024'));
  assert(rent.valuation.referencia.includes('renta derivada'));
  assert.equal(rent.valuation.banda, null);
  assert.equal(rent.valuation.intervalo, undefined);
  assert(load('lib/dashboard-format.ts').priceComparison(rent.valuation).includes('renta mensual estimada'));
  const scoring=load('lib/personal-score.ts').personalScore(mixed.anuncios[1], rent, null).scoring;
  assert.equal(scoring.components.find(c => c.key === 'fair').value, Math.round(Math.min(100,Math.max(0,50 - 2.5 * mixed.respuesta.resultados[1].brecha_pct))*10)/10);
  assert.equal(scoring.components.find(c => c.key === 'opportunity').value,null);
  assert.equal(scoring.fair.unit,'€/mes');
});

test('chat requires the observed operation and preserves rental monthly price', async () => {
  let observed;
  const load = loader(mixed.respuesta, {
    '@/lib/valoracion/client': { valorarLoteConEstado: async ps => {
      observed = ps[0]; return { resultados: new Map(), estados: new Map() };
    } },
  });
  const tool = load('lib/agent/tools/valorar-vivienda.ts').runValorarVivienda;
  const rental = mixed.anuncios[1];
  const result = await tool(rental);
  assert.equal(observed.operation, 'rent');
  assert.equal(observed.price, 1500);
  assert.equal(result.operation, 'rent');
  await assert.rejects(tool({ ...rental, operation: undefined }));
});
