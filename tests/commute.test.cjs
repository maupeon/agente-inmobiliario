const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const test = require('node:test');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
function load(file, env = {}, fetcher = async () => { throw Error('Offline'); }, stubs = {}) {
  const mod = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { module: mod, exports: mod.exports, process: { env },
    AbortSignal, fetch: fetcher, require: id => {
      if (id === 'server-only') return {};
      if (Object.hasOwn(stubs, id)) return stubs[id];
      throw Error(`Unexpected dependency ${id}`);
    },
  });
  return mod.exports;
}
const opts = { origen: {lat:40.4168,lon:-3.7038,direccion:'Vivienda'},
  destino:{lat:40.4463,lon:-3.6925,etiqueta:'Trabajo'},modos:['bici'],preferido:'bici' };
const coords = [[-3.7038,40.4168],[-3.7000,40.4200],[-3.6950,40.4300],[-3.6925,40.4463]];
const response = (coordinates = coords, duration = 1020) => Response.json({features:[{
  properties:{summary:{duration,distance:4200}}, geometry:{type:'LineString',coordinates},
}]});

test('street route preserves provider geometry and requests the chosen direction and mode', async () => {
  let calls=0;
  const {computeCommute}=load('lib/commute/index.ts',{ORS_API_KEY:'test'},async(url,request)=>{
    calls++;
    assert.match(url,/cycling-regular\/geojson$/);
    assert.deepEqual(JSON.parse(request.body).coordinates,[coords[0],coords.at(-1)]);
    return response();
  });
  const result=await computeCommute(opts);
  assert.deepEqual(JSON.parse(JSON.stringify(result.rutaGeo.geometria)),coords);
  assert.equal(result.rutaGeo.aprox,false);
  assert.equal(result.modos[0].minutos,17);
  assert.equal(calls,1);
});

test('no credentials, mock mode and provider failure never draw a straight-line route', async () => {
  for (const env of [{},{ORS_API_KEY:'test',MOCK_COMMUTE:'true'},{ORS_API_KEY:'test'}]) {
    const result=await load('lib/commute/index.ts',env).computeCommute(opts);
    assert.equal(result.rutaGeo,undefined);
    assert.equal(result.proveedor,'estimacion');
    assert(result.modos[0].minutos>0);
  }
});

test('invalid coordinates never reach the map and zero-minute routes remain valid', async () => {
  for(const coordinates of [[],[[0,0]],[[null,40],[0,40]],[[181,40],[0,40]],[[0,91],[0,40]]]) {
    const result=await load('lib/commute/index.ts',{ORS_API_KEY:'test'},async()=>response(coordinates)).computeCommute(opts);
    assert.equal(result.rutaGeo,undefined);
  }
  const result=await load('lib/commute/index.ts',{ORS_API_KEY:'test'},async()=>response(coords,0)).computeCommute(opts);
  assert.equal(result.modos[0].minutos,0);
  assert.equal(result.rutaGeo.aprox,false);
});

test('property enrichment routes from the property to work, which matters on one-way streets', async () => {
  let route;
  const stubs={
    '@/lib/commute':{computeCommute:async args=>{route=args;return null}},
    '@/lib/commute/places':{},
    '@/lib/market/cache':{getMarketData:async()=>({fromFallback:true,data:{}})},
    '@/lib/market/match-province':{}, '@/lib/market/rent':{},
    '@/lib/neighborhood/report':{buildNeighborhoodReport:()=>null},
    '@/lib/valoracion/client':{valorarLoteConEstado:async()=>({resultados:new Map(),estados:new Map()})},
    '@/lib/valoracion/types':{},
  };
  const {enrichProperties}=load('lib/enrich.ts',{},undefined,stubs);
  await enrichProperties([{propertyCode:'one',price:300000,size:60,operation:'sale',
    latitude:opts.origen.lat,longitude:opts.origen.lon,address:'Vivienda'}],{
    trabajo:{lat:opts.destino.lat,lon:opts.destino.lon,direccion:'Trabajo',modo:'bici'},
  });
  assert.equal(route.origen.lat,opts.origen.lat);
  assert.equal(route.origen.direccion,'Vivienda');
  assert.equal(route.destino.lat,opts.destino.lat);
  assert.equal(route.destino.etiqueta,'Trabajo');
});

test('invalid journey inputs fail before routing and antipodal distances stay finite', async () => {
  let calls=0;
  const {computeCommute,haversineKm}=load('lib/commute/index.ts',{ORS_API_KEY:'test'},async()=>{calls++;return response()});
  for(const origen of [{lat:Infinity,lon:0},{lat:91,lon:0},{lat:40,lon:181}]) {
    await assert.rejects(computeCommute({...opts,origen:{...origen,direccion:'Invalid'}}));
  }
  await assert.rejects(computeCommute({...opts,modos:['unknown']}));
  assert.equal(calls,0);
  assert(Number.isFinite(haversineKm({lat:0,lon:0},{lat:0,lon:180})));
});

test('a real car route never labels the recommended transit time as measured', async () => {
  const {computeCommute}=load('lib/commute/index.ts',{ORS_API_KEY:'test'},async()=>response());
  const result=await computeCommute({...opts,modos:['coche','transporte'],preferido:'transporte'});
  assert.equal(result.recomendado,'transporte');assert.equal(result.proveedor,'estimacion');
  assert.equal(result.rutaGeo.aprox,true);assert.match(result.nota,/estimados/);
});
