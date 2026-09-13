const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const test = require('node:test');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
function loader(stubs = {}, env = {}, fetcher = async () => { throw Error('NETWORK BLOCKED'); }) {
  const cache = new Map();
  return function load(file) {
    file = path.isAbsolute(file) ? file : path.join(root, file);
    if (!fs.existsSync(file)) file += '.ts';
    if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.ts');
    if (cache.has(file)) return cache.get(file).exports;
    const mod = { exports: {} }; cache.set(file, mod);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    vm.runInNewContext(code, { module: mod, exports: mod.exports, require: id => Object.hasOwn(stubs, id) ? stubs[id]
      : id === 'server-only' ? {} : id.startsWith('@/') ? load(id.slice(2)) : id.startsWith('.') ? load(path.resolve(path.dirname(file), id)) : require(id),
      console: { error() {}, log() {} }, process: { env }, URL, URLSearchParams, Response, Request, AbortSignal, AbortController,
      TextDecoder, TextEncoder, Buffer, setTimeout, clearTimeout, fetch: fetcher,
    }, { filename: file });
    return mod.exports;
  };
}
const madrid = { lat: 40.4168, lon: -3.7038 };
const barcelona = { lat: 41.3851, lon: 2.1734 };
const valencia = { lat: 39.4699, lon: -0.3763 };
const alcorcon = { lat: 40.3458, lon: -3.8249 };
const pozuelo = { lat: 40.4359, lon: -3.8134 };
const geocodes = { Barcelona: barcelona, Valencia: valencia, 'Alcorcón, Madrid': alcorcon, 'Chamberí Barcelona': barcelona, 'Madrid, Comunidad de Madrid, España': madrid, 'Calle de Valencia, Madrid': {lat:40.4078,lon:-3.7005} };
const geo = { geocodeAddress: async q => geocodes[q] ? { ...geocodes[q], label: q } : null };
const base = { zona: 'Madrid', operacion: 'alquiler' };
const property = { propertyCode:'one', operation:'rent', municipality:'Madrid', latitude:madrid.lat, longitude:madrid.lon, price:1500, size:80, rooms:2, propertyType:'flat' };

test('municipal boundary accepts Madrid districts but excludes other cities and nearby municipalities', () => {
  const { isMadridPoint, isMadridProperty } = loader()('lib/search-scope.ts');
  for (const p of [madrid, {lat:40.4319,lon:-3.7036}, {lat:40.4737,lon:-3.582}, {lat:40.518,lon:-3.777}]) assert(isMadridPoint(p.lat,p.lon));
  for (const p of [barcelona,valencia,alcorcon,pozuelo,{lat:NaN,lon:-3.7},{lat:40.42,lon:Infinity}]) assert(!isMadridPoint(p.lat,p.lon));
  assert(isMadridProperty(property));
  assert(!isMadridProperty({...property,municipality:'Pozuelo de Alarcón'}));
  assert(!isMadridProperty({...property,latitude:barcelona.lat,longitude:barcelona.lon}));
});

test('text and saved/map centers cannot bypass scope, while Madrid streets and accents work', async () => {
  const { validateMadridSearch } = loader({'@/lib/commute':geo})('lib/search-location.ts');
  for (const zona of ['Madrid','Chamberí','Retiro','Calle de Valencia, Madrid','Madrid, Comunidad de Madrid, España','40.4168, -3.7038']) {
    assert(await validateMadridSearch({...base,zona}));
  }
  for (const filters of [
    ...['Barcelona','Valencia','Alcorcón, Madrid','Chamberí Barcelona'].map(zona=>({...base,zona})),
    {...base,zona:'Barcelona',centro:madrid}, {...base,centro:barcelona}, {...base,centro:pozuelo},
    {...base,locationId:'opaque-id'}, {...base,radioMetros:Infinity}, {...base,radioMetros:-2},
  ]) await assert.rejects(validateMadridSearch(filters), err=>err.status===400);
});

test('outside requests from agent and profiles never consume Idealista quota, including demo', async () => {
  for (const mock of ['true','false']) {
    let externalCalls = 0;
    const noCall = async () => { externalCalls++; throw Error('should not reach provider'); };
    const load = loader({'@/lib/commute':geo,'./auth':{getAccessToken:noCall},'./usage':{reserveIdealistaRequest:noCall},
      './search-cache':{cachedSearch:async(_key,fn)=>fn()}}, {MOCK_IDEALISTA:mock}, noCall);
    await assert.rejects(load('lib/agent/tools/buscar-propiedades.ts').runBuscarPropiedades({...base,zona:'Barcelona'}));
    await assert.rejects(load('lib/idealista/search.ts').searchProperties({...base,centro:valencia}));
    await assert.rejects(load('lib/recommend.ts').recommend({profile:{zona:'Valencia',zonaLat:valencia.lat,zonaLon:valencia.lon,operacion:'alquiler'}}));
    assert.equal(externalCalls,0);
    if (mock==='true') {
      const props=await load('lib/idealista/search.ts').searchProperties(base);
      assert(props.length>0);assert(props.every(p=>p.municipality==='Madrid'));
    }
  }
});

test('real and cached search results crossing the city boundary are filtered', async () => {
  for (const cached of [true,false]) {
    const outside={...property,propertyCode:'outside',municipality:'Pozuelo de Alarcón',latitude:pozuelo.lat,longitude:pozuelo.lon};
    let calls=0;
    const load=loader({'@/lib/commute':geo,'./auth':{getAccessToken:async()=> 'test'},'./usage':{reserveIdealistaRequest:async()=>{calls++;}},
      './search-cache':{cachedSearch:async(_key,fn)=>cached?[property,outside]:fn()}}, {}, async()=>Response.json({elementList:[property,outside]}));
    const result=await load('lib/idealista/search.ts').searchProperties(base);
    assert.equal(result.length,1);assert.equal(result[0].propertyCode,'one');assert.equal(calls,cached?0:1);
  }
});

test('scoped geocoder rejects external pins and cities but general commute lookup remains available', async () => {
  const route=loader({'@/lib/commute':{...geo,reverseGeocode:async()=>({label:'Madrid'})}})('app/api/geocode/route.ts');
  const get=query=>route.GET({nextUrl:new URL('http://local/api/geocode?'+query)});
  for (const query of ['scope=madrid&q=Barcelona','scope=madrid&q=Valencia',`scope=madrid&lat=${pozuelo.lat}&lon=${pozuelo.lon}`]) {
    const r=await get(query);assert.equal(r.status,400);assert((await r.json()).error.includes('Madrid capital'));
  }
  assert.equal((await get('scope=madrid&q=Chamber%C3%AD')).status,200);
  const work=await get('q=Barcelona');assert.equal(work.status,200);assert.equal((await work.json()).result.lat,barcelona.lat);
});
