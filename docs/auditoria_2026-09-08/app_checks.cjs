/* Auditoría aislada: no red, no credenciales, no escrituras a servicios. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '../..');
const req = createRequire(path.join(root, 'package.json'));
const ts = req('typescript');
const findings = [];

function loader(stubs = {}, globals = {}) {
  const cache = new Map();
  return function load(file) {
    file = path.isAbsolute(file) ? file : path.join(root, file);
    if (!fs.existsSync(file)) file += '.ts';
    if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.ts');
    if (cache.has(file)) return cache.get(file).exports;
    const mod = { exports: {} }; cache.set(file, mod);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
      fileName: file,
    }).outputText;
    const localRequire = id => {
      if (Object.hasOwn(stubs, id)) return stubs[id];
      if (id === 'server-only') return {};
      if (id.startsWith('@/')) return load(path.join(root, id.slice(2)));
      if (id.startsWith('.')) return load(path.resolve(path.dirname(file), id));
      return req(id);
    };
    const context = { module: mod, exports: mod.exports, require: localRequire,
      console, process: { env: {} }, Buffer, URL, URLSearchParams, Response, Request,
      ReadableStream, TextEncoder, TextDecoder, AbortController, AbortSignal,
      setTimeout, clearTimeout, crypto: require('node:crypto').webcrypto,
      fetch: async () => { throw new Error('NETWORK BLOCKED BY AUDIT'); }, ...globals };
    vm.runInNewContext(code, context, { filename: file });
    return mod.exports;
  };
}

async function main() {
  const load = loader();
  const neighborhoods = load('lib/neighborhood/report.ts');
  for (const [zone, province] of [['', 'Málaga'], ['Centro', 'Málaga'], ['Salamanca', 'Salamanca']]) {
    const r = neighborhoods.buildNeighborhoodReport(zone, province);
    findings.push({ check: 'neighborhood_match', input: { zone, province }, match: r.zona, security: r.seguridad.indice });
  }

  const valuation = load('lib/valoracion/client.ts');
  const base = { operation: 'sale', size: 90, latitude: 41.38, longitude: 2.17 };
  for (const municipality of ['Rozas de Madrid, Las', 'Madrid', undefined]) {
    findings.push({ check: 'model_domain_gate', municipality: municipality ?? '(missing)', province: 'Madrid', coordinates: 'Barcelona', accepted: valuation.esValorable({ ...base, municipality, province: 'Madrid' }) });
  }

  let persistCalls = [];
  const loadChat = loader({
    '@/lib/agent/loop': { executeAgentLoop: async (_, send) => send({ type: 'text', text: 'Respuesta de prueba' }) },
    '@/lib/analytics': { trackEvent: async () => {} },
    '@/lib/supabase/conversations': { persistTurn: async input => { persistCalls.push(input.conversationId ?? null); return { conversationId: 'database-generated-id' }; } },
    '@/lib/rate-limit': { rateLimit: () => ({ ok: true }) },
  });
  const chat = loadChat('app/api/chat/route.ts');
  const userMessage = { id: 'test', role: 'user', content: 'Hola', createdAt: '2026-09-08' };
  const request = body => new Request('http://audit.local/api/chat', { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } });
  const response = await chat.POST(request({ messages: [userMessage] }));
  const events = (await response.text()).trim().split('\n\n').map(x => JSON.parse(x.slice(6)));
  const provisionalId = events.find(x => x.type === 'conversation').id;
  await chat.POST(request({ messages: [userMessage], conversationId: provisionalId }));
  await new Promise(resolve => setImmediate(resolve));
  findings.push({ check: 'conversation_id_persistence', provisionalId, databaseId: 'database-generated-id', nextTurnPersistenceId: persistCalls[1], databaseIdEverSent: events.some(x => x.id === 'database-generated-id') });
  for (const body of [null, { messages: 'wrong' }, { messages: [{ role: 'user', content: 42 }] }]) {
    try { const res = await chat.POST(request(body)); findings.push({ check: 'invalid_chat_body', body, status: res.status }); }
    catch (err) { findings.push({ check: 'invalid_chat_body', body, uncaught: err.message }); }
  }

  const fallback = load('lib/market/fixtures.ts').FALLBACK_PRICE_BY_PROVINCE;
  const chain = { from() { return this; }, select() { return this; }, eq() { return this; }, maybeSingle: async () => ({ data: { data: fallback, updated_at: '2026-09-08T00:00:00Z' }, error: null }) };
  const cacheLoader = loader({ '@/lib/supabase/server': { getServerSupabase: () => chain } });
  const cacheResult = await cacheLoader('lib/market/cache.ts').getMarketData('ine_price_by_province');
  findings.push({ check: 'cached_fixture_provenance', fromFallback: cacheResult.fromFallback, actualSource: cacheResult.data.fuente });

  const finance = load('lib/finance/rent-vs-buy.ts');
  let contradictory;
  outer: for (const price of [150000, 300000, 600000]) for (const rent of [700, 1200, 2200]) for (const growth of [-3, 0, 2, 4]) for (const investment of [4, 8, 12]) for (const horizon of [10, 20, 40]) {
    const input = { precioVivienda: price, alquilerMensual: rent, revalorizacionViviendaAnual: growth, rentabilidadInversionAnual: investment, horizonteAnios: horizon, capitalDisponible: 200000, subidaAlquilerAnual: 0 };
    const r = finance.runCompararAlquilerCompra(input);
    if (r.veredicto.ganador === 'comprar' && r.ventajaCompra < -1000) {
      contradictory = { input, breakEven: r.breakEvenAnios, finalPurchaseAdvantage: r.ventajaCompra, winner: r.veredicto.ganador, narrative: r.veredicto.resumen };
      break outer;
    }
  }
  findings.push({ check: 'finance_winner_vs_final_wealth', contradiction: contradictory ?? null });
  const habitual = finance.runCompararAlquilerCompra({ viviendaHabitual: true });
  const taxable = finance.runCompararAlquilerCompra({ viviendaHabitual: false });
  findings.push({ check: 'habitual_implies_tax_exemption_without_other_conditions', defaultPurchaseWealth: habitual.patrimonioFinalCompra, otherwiseSameTaxableWealth: taxable.patrimonioFinalCompra, difference: habitual.patrimonioFinalCompra - taxable.patrimonioFinalCompra });

  const historyCalls = [];
  const databaseMock = { from(table) { historyCalls.push(['from', table]); return this; }, select() { return this; }, order() { return this; }, limit() { return this; }, eq(...args) { historyCalls.push(['eq', ...args]); return this; }, then(resolve) { resolve({ data: [], error: null }); } };
  const conv = loader({ './server': { getServerSupabase: () => databaseMock } })('lib/supabase/conversations.ts');
  await conv.listConversations(null);
  await conv.getConversationMessages('foreign-conversation');
  findings.push({ check: 'conversation_authorization_query_trace', calls: historyCalls });
  console.log(JSON.stringify(findings, null, 2));
}
main().catch(err => { console.error(err); process.exitCode = 1; });
