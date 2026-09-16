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
  assert.equal(value.nivel_precios, '2026');
  assert.equal(value.ajuste_proyectado, true);
  assert.equal(value.ultimo_ano_venta, 2025);
  assert.equal(value.ultimo_ano_alquiler, 2024);
  assert.equal(posted.ano_ajuste, 2026);
  assert.equal(posted.anuncios[0].description, anuncio.description);
  assert.equal(posted.anuncios[0].parkingSpace.hasParkingSpace, true);
  assert.equal(posted.anuncios[0].operation, 'sale');
});

test('v3 rejects forged periods, intervals, model identities, rental claims and inconsistent arithmetic', async () => {
  for (const changed of [{ model_id: 'habitIA-oferta-2018-v2' }, { nivel_precios: '2026T1' },
    { model_version: '2.0.0' }, { model_version: '3.1.0' }, { modelo_sha256: '5d29cd26889cc0777196f592aa9828b18cc7d71ccd1a05ee61a95f0a44741a04' }, { intervalo: [300000, 700000] }, { banda: 'barato' },
    { oportunidad: true }, { alquiler_validado: true }, { ano_renta: 2024 }, { ajuste_proyectado: false }, { ultimo_ano_venta: 2026 }, { ultimo_ano_alquiler: 2026 }, { ano_inicio_tendencia: 2026 }, { paquete_sha256: '' },
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
    { ...respuesta, model_id: 'unknown' }, { ...respuesta, nivel_precios: '2025' }, { ...respuesta, paquete_sha256: 'legacy-package' }]) {
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
  assert.equal(enriched.valuation.rentaEscenario.ano, 2026);
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
  const normalized = load('lib/idealista/search.ts').normalizeProperty({ ...anuncio, newDevelopment: true }, 'venta');
  assert.equal(normalized.description, anuncio.description);
  assert.equal(normalized.parkingSpace.hasParkingSpace, true);
  await load('lib/agent/tools/valorar-vivienda.ts').runValorarVivienda(normalized);
  assert.equal(observed.description, anuncio.description);
  assert.equal(observed.parkingSpace.hasParkingSpace, true);
  assert.equal(normalized.newDevelopment, true);
  assert.equal(observed.newDevelopment, true);
});

const mixed = require('./fixtures/valoracion-v3-mixed.json');
test('v3.3 compares sale totals and monthly rent in the same HTTP batch', async () => {
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
  assert.equal(rent.brecha_pct, mixed.respuesta.resultados[1].brecha_pct);
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
  assert.equal(rent.valuation.referenciaEurM2, Math.round(mixed.respuesta.resultados[1].renta_mensual_estimada / mixed.anuncios[1].size * 10) / 10);
  assert(rent.valuation.avisoModelo.includes('2024'));
  assert(rent.valuation.referencia.includes('renta derivada'));
  assert.equal(rent.valuation.banda, null);
  assert.equal(rent.valuation.intervalo, undefined);
  assert(load('lib/dashboard-format.ts').priceComparison(rent.valuation).includes('renta mensual estimada'));
  const scoring=load('lib/personal-score.ts').personalScore({...mixed.anuncios[1],district:'Chamberí'}, rent, null).scoring;
  assert.equal(scoring.components.find(c => c.key === 'fair').value, Math.round(Math.min(100,Math.max(0,50 - 2.5 * mixed.respuesta.resultados[1].brecha_pct))*10)/10);
  assert.equal(scoring.components.find(c => c.key === 'opportunity').value,54.5);
  assert.equal(scoring.opportunity.sourceUrl.includes('/venta/'),true);
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

test('v3.3 requires the 2026 projection and distinguishes the 2025/2024 observed sources', async () => {
  const batch = await loader(mixed.respuesta)('lib/valoracion/client.ts').valorarLoteConEstado(mixed.anuncios);
  assert.equal(batch.resultados.size, mixed.respuesta.resultados.length);
  for (const input of mixed.anuncios) assert(batch.estados.get(input.propertyCode).motivo.includes('proyectad'));
  assert(batch.estados.get(mixed.anuncios[0].propertyCode).motivo.includes('2026'));
  assert(batch.estados.get(mixed.anuncios[0].propertyCode).motivo.includes('2025'));
  assert(batch.estados.get(mixed.anuncios[1].propertyCode).motivo.includes('2024'));
  const previous = structuredClone(mixed.respuesta);
  previous.model_version = '3.2.0';
  previous.nivel_precios = '2025';
  for (const value of previous.resultados) {
    value.model_version = '3.2.0';
    value.nivel_precios = '2025';
    value.ano_precio = 2025;
    value.ano_renta = 2024;
    value.metodo_renta = 'ratio_distrital_2024';
  }
  assert.equal((await loader(previous)('lib/valoracion/client.ts').valorarLoteConEstado(mixed.anuncios)).resultados.size, 0);
  for (const changed of [{ ano_precio: 2025, nivel_precios: '2025' }, { ano_renta: 2024, metodo_renta: 'ratio_distrital_2024' }, { ano_precio: '2026' }, { ano_renta: 2026.5 }, { metodo_renta: 'ratio_distrital_2026' }, { paquete_sha256: undefined }]) {
    const invalid = structuredClone(mixed.respuesta);
    invalid.resultados = [{ ...invalid.resultados[0], ...changed }];
    const rejected = await loader(invalid)('lib/valoracion/client.ts').valorarLoteConEstado(mixed.anuncios);
    assert.equal(rejected.resultados.size, 0, JSON.stringify(changed));
  }
});

test('v3.3 new-development flag reaches the API, is required in results and preserves warnings', async () => {
  let posted;
  const response = structuredClone(respuesta);
  response.resultados[0].calidad.obra_nueva = true;
  response.resultados[0].advertencias.push('Obra nueva: las viviendas de una promoción no son observaciones independientes.');
  const load = loader(response, {}, data => { posted = data; });
  const batch = await load('lib/valoracion/client.ts').valorarLoteConEstado([{ ...anuncio, newDevelopment: true }]);
  assert.equal(posted.anuncios[0].newDevelopment, true);
  assert.equal(batch.resultados.get(anuncio.propertyCode).calidad.obra_nueva, true);
  assert(batch.resultados.get(anuncio.propertyCode).advertencias.some(v => v.includes('promoción')));
  delete response.resultados[0].calidad.obra_nueva;
  assert.equal((await loader(response)('lib/valoracion/client.ts').valorarLoteConEstado([anuncio])).resultados.size, 0);
  for (const flag of [false, undefined]) {
    await loader(respuesta, {}, data => { posted = data; })('lib/valoracion/client.ts').valorarLoteConEstado([{ ...anuncio, newDevelopment: flag }]);
    assert.equal(posted.anuncios[0].newDevelopment, flag);
  }
});

test('description abstentions keep Fair unavailable and weighted Fit Score partial', async () => {
  for (const reason of ['a_reformar', 'ocupada', 'a_reformar;ocupada']) {
    const response = { ...respuesta, resultados: [], errores: [{ propertyCode: anuncio.propertyCode, indice: 0, estado: 'fuera_ambito', detalle: reason }] };
    const load = loader(response, {
      '@/lib/market/cache': { getMarketData: async () => ({ data: { data: [] }, fromFallback: true }) },
      '@/lib/market/match-province': { findProvincePrice: () => null },
      '@/lib/market/rent': { findRentReference: () => null },
    });
    const property = { ...anuncio, district: 'Centro' };
    const [enriched] = await load('lib/enrich.ts').enrichProperties([property]);
    assert.equal(enriched.valuation.estadoModelo, 'fuera_ambito');
    const message = enriched.valuation.avisoModelo;
    assert(message.startsWith('El modelo no estima esta vivienda porque'));
    if (reason.includes('a_reformar')) assert(message.includes('a reformar o para actualizar'));
    if (reason.includes('ocupada')) assert(message.includes('ocupada, alquilada o sin plena posesión'));
    assert(!message.includes('a_reformar'));
    const score = load('lib/personal-score.ts').personalScore(property, enriched, { scoreWeights: { alpha: 75, beta: 25, gamma: 0, delta: 0 } });
    assert.equal(score.scoring.fair, null);
    assert.equal(score.scoring.components.find(c => c.key === 'fair').value, null);
    assert.equal(score.scoring.coveragePercent, 25);
    assert.equal(score.score, Math.round(score.scoring.opportunity.score * 0.25));
    assert(score.scoring.components[0].explanation.includes(message));
    const contradiction = { ...response, resultados: respuesta.resultados };
    assert.equal((await loader(contradiction)('lib/valoracion/client.ts').valorarLoteConEstado([anuncio])).resultados.size, 0);
  }
});

test('a valid response for a different advertised price cannot supply Fair', async () => {
  const batch = await loader(respuesta)('lib/valoracion/client.ts').valorarLoteConEstado([{ ...anuncio, price: anuncio.price + 1 }]);
  assert.equal(batch.resultados.size, 0);
  assert.equal(batch.estados.get(anuncio.propertyCode).estado, 'no_disponible');
});


test('unknown abstention details remain intact instead of being guessed', async () => {
  for (const detail of ['fuera_del_nuevo_ambito', 'a_reformar;nuevo_motivo', 'Faltan datos registrales observados.']) {
    const response = { ...respuesta, resultados: [], errores: [{ propertyCode: anuncio.propertyCode, estado: 'fuera_ambito', detalle: detail }] };
    const batch = await loader(response)('lib/valoracion/client.ts').valorarLoteConEstado([anuncio]);
    assert.equal(batch.estados.get(anuncio.propertyCode).motivo, detail);
  }
});
