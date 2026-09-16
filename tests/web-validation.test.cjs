/* Regresiones de entradas públicas y persistencia; sin red ni credenciales. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const test = require('node:test');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
function loader(stubs = {}, globals = {}) {
  const cache = new Map();
  function load(name) {
    let file = path.resolve(root, name);
    if (!fs.existsSync(file)) file += '.ts';
    if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.ts');
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} }; cache.set(file, module);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    const localRequire = id => Object.hasOwn(stubs, id) ? stubs[id] : id === 'server-only' ? {}
      : id.startsWith('@/') ? load(id.slice(2)) : id.startsWith('.') ? load(path.resolve(path.dirname(file), id)) : require(id);
    vm.runInNewContext(code, { module, exports: module.exports, require: localRequire, console: {error(){},warn(){},info(){}},
      process: {env:{}}, Buffer, URL, URLSearchParams, Response, Request, TextEncoder, TextDecoder,
      ReadableStream, AbortController, AbortSignal, setTimeout, clearTimeout,
      fetch: async () => { throw Error('NETWORK BLOCKED'); }, ...globals }, {filename:file});
    return module.exports;
  }
  return load;
}
const property = {propertyCode:'12345',title:'Vivienda observada',operation:'rent',price:1500,size:80,rooms:2,bathrooms:1,
  propertyType:'flat',municipality:'Madrid',latitude:40.42,longitude:-3.7,address:'Madrid',thumbnail:'/property-demo.svg',
  url:'https://www.idealista.com/inmueble/12345/',newDevelopment:false,parkingSpace:{hasParkingSpace:false},description:'Vivienda alquilada.'};
const message = {id:'message-1',role:'assistant',content:'Resultado guardado',createdAt:'2026-09-16T10:00:00Z'};
const request = (body, endpoint = 'test') => new Request(`https://habitia.test/api/${endpoint}`, {
  method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),
});

test('saved properties reject executable URLs and malformed fields while real and demo records remain valid', () => {
  const {validProperty,validDisplayProperty,safeWebUrl}=loader()('lib/api-validation.ts');
  assert(validDisplayProperty(property));assert(validDisplayProperty({...property,url:'',sourceKind:'demo'}));
  for(const extra of [{title:{}},{url:'javascript:alert(1)'},{url:'java\nscript:alert(1)'},{url:'data:text/html,test'},
    {thumbnail:'//evil.test/image'},{features:[{}]},{photos:['javascript:alert(1)']},{hasLift:'yes'},
    {rooms:1.2},{latitude:91},{longitude:181},{size:0},{propertyCode:'__proto__'},{parkingSpace:[]},{detailedType:{typology:{}}}]) {
    assert.equal(validProperty({...property,...extra}),false,JSON.stringify(extra));
  }
  assert.equal(validDisplayProperty({...property,title:undefined}),false);
  assert.equal(safeWebUrl('/\\evil.test',true),false);
  assert.equal(safeWebUrl('https://user:secret@host.test/a'),false);
});

test('profile coordinates, budget and rooms are validated without changing explicit zero bedrooms',()=>{
  const {validatedProfile}=loader()('lib/api-validation.ts');
  const base={operacion:'alquiler',habitaciones:0,zonaLat:40.4,zonaLon:-3.7,trabajo:{direccion:'Madrid',lat:40.4,lon:-3.7}};
  assert.equal(validatedProfile(base).habitaciones,0);
  for(const extra of [{presupuestoMax:-1},{habitaciones:2.5},{zonaLat:Infinity},{zonaLon:200},{zonaLon:undefined},
    {trabajo:{direccion:'Madrid',lat:NaN,lon:-3.7}},{trabajo:{direccion:'Madrid',lat:40.4}}]) assert.throws(()=>validatedProfile({...base,...extra}));
});

test('shared messages reject broken cards and recover older damaged rows without losing their text',()=>{
  const load=loader();const {demoMessages}=load('lib/supabase/demo.ts');
  const {readStoredMessage}=load('lib/message-validation.ts');
  for(const card of ['mortgage','market','rent','commute','neighborhood','purchaseValuation']) {
    const broken={...message,[card]:{}};
    assert.throws(()=>demoMessages([broken]),card);
    const recovered=readStoredMessage(broken);
    assert.equal(recovered.content,message.content);assert.equal(recovered[card],undefined);
  }
  assert.throws(()=>demoMessages([{...message,properties:[{...property,url:'javascript:alert(1)'}]}]));
  const mortgage=load('lib/agent/tools/calcular-hipoteca.ts').calcularHipoteca({precioPropiedad:300000});
  const neighborhood=load('lib/neighborhood/report.ts').buildNeighborhoodReport('Centro','Madrid');
  const valuation=require('./fixtures/valoracion-v3-mixed.json').respuesta.resultados[0];
  const valid={...message,properties:[property],mortgage,neighborhood,purchaseValuation:{estado:'ok',propertyCode:valuation.propertyCode,resultado:valuation,aviso:'Escenario histórico'}};
  assert.equal(demoMessages([valid])[0].mortgage.monthlyPayment,mortgage.monthlyPayment);
  assert.equal(readStoredMessage({...message,properties:[property,{...property,title:{}}]}).properties.length,1);
});

test('old v3.2 chat valuations retain an explicit warning without retaining stale prices',()=>{
  const load=loader();
  const {readStoredMessage}=load('lib/message-validation.ts');
  const {STALE_MODEL_NOTICE}=load('lib/valoracion/current-model.ts');
  const historical={...require('./fixtures/valoracion-v3-mixed.json').respuesta.resultados[0],model_version:'3.2.0'};
  delete historical.ultimo_ano_venta;delete historical.ultimo_ano_alquiler;
  const stored={...message,content:'La vivienda se estima en 450.000 euros.',purchaseValuation:{propertyCode:'old',operation:'sale',estado:'ok',resultado:historical,aviso:'Antigua valoración'}};
  const recovered=readStoredMessage(stored);
  assert.equal(recovered.content,stored.content);
  assert.equal(recovered.purchaseValuation.estado,'no_disponible');
  assert.equal(recovered.purchaseValuation.aviso,STALE_MODEL_NOTICE);
  assert.equal(recovered.purchaseValuation.resultado,null);
  assert(!JSON.stringify(recovered.purchaseValuation).includes('precio_estimado'));
  assert.equal(load('lib/supabase/demo.ts').demoMessages([stored])[0].purchaseValuation.aviso,STALE_MODEL_NOTICE);
  assert.equal(readStoredMessage(recovered).purchaseValuation.aviso,STALE_MODEL_NOTICE);
});

test('current valuation cards still require observed-source years and malformed identities are discarded',()=>{
  const load=loader();const {readStoredMessage}=load('lib/message-validation.ts');
  const current={...require('./fixtures/valoracion-v3-mixed.json').respuesta.resultados[0]};
  const stored={...message,purchaseValuation:{propertyCode:'current',estado:'ok',resultado:current,aviso:'Escenario vigente'}};
  assert.equal(readStoredMessage(stored).purchaseValuation.resultado.model_version,'3.3.0');
  delete current.ultimo_ano_venta;
  assert.equal(readStoredMessage(stored).purchaseValuation,undefined);
  assert.equal(readStoredMessage({...message,purchaseValuation:{propertyCode:'old',estado:'ok',resultado:{model_id:{bad:true},model_version:'3.2.0'}}}).purchaseValuation,undefined);
});

test('favorite and valuation endpoints reject malformed input before touching storage or model',async()=>{
  let writes=0, valuations=0;
  const load=loader({
    '@/lib/rate-limit':{rateLimit:()=>({ok:true})},
    '@/lib/supabase/demo':{saveDemoFavorite:async()=>{writes++;}},
    '@/lib/valoracion/client':{MAX_VALORACION_BATCH:24,valorarLoteConEstado:async()=>{valuations++;return {resultados:new Map(),estados:new Map()};}},
  });
  const favorites=load('app/api/favorites/route.ts');const model=load('app/api/valoracion/route.ts');
  assert.equal((await favorites.POST(request({property:{...property,url:'javascript:alert(1)'}}))).status,400);
  assert.equal((await favorites.POST(request({property:{...property,title:{}}}))).status,400);
  assert.equal(writes,0);
  for(const properties of [[{...property,size:0}],[{...property,rooms:'two'}],[property,property]]) assert.equal((await model.POST(request({properties}))).status,400);
  assert.equal(valuations,0);
  assert.equal((await favorites.POST(request({property}))).status,200);assert.equal(writes,1);
});

test('long chat history remains within server limits and preserves the most recent complete question',async()=>{
  const load=loader({'@/lib/rate-limit':{rateLimit:()=>({ok:true})},'@/lib/agent/loop':{executeAgentLoop:async()=>{}}});
  const {chatHistory}=load('lib/chat-history.ts');
  const question='¿Puedes comparar esta vivienda? '.repeat(200);
  const messages=Array.from({length:30},(_,i)=>({...message,id:`m-${i}`,role:i%2?'assistant':'user',content:'a'.repeat(7000),properties:i%2?[property]:undefined}));
  messages.push({...message,id:'last',role:'user',content:question,properties:undefined});
  const history=chatHistory(messages);
  assert(history.length<=20);assert(history.every(m=>m.content.length<=8000));
  assert(history.reduce((n,m)=>n+m.content.length,0)<=32000);
  assert.equal(history[0].role,'user');assert.equal(history.at(-1).content,question);
  const response=await load('app/api/chat/route.ts').POST(request({messages:history}));
  assert.equal(response.status,200);await response.text();
});

test('chat preserves observed operation, condition and construction evidence without cutting descriptions',async()=>{
  const load=loader({'@/lib/idealista/search':{searchProperties:async()=>[property]}});
  const {chatHistory}=load('lib/chat-history.ts');
  const messages=[{...message,role:'user',content:'Busca alquiler'}, {...message,properties:[property]}, {...message,role:'user',content:'Valóralo'}];
  const history=chatHistory(messages);
  const stored=JSON.parse(history[1].content.split('instrucciones): ')[1])[0];
  assert.equal(stored.operation,'rent');assert.equal(stored.description,property.description);
  assert.equal(stored.newDevelopment,false);assert.equal(stored.parkingSpace.hasParkingSpace,false);
  const search=await load('lib/agent/tools/buscar-propiedades.ts').runBuscarPropiedades({zona:'Madrid',operacion:'alquiler'});
  assert.equal(search.summary[0].operation,'rent');assert.equal(search.summary[0].description,property.description);
  const tooLong=chatHistory([{...message,role:'user',content:'Busca'}, {...message,properties:[{...property,description:'x'.repeat(9000)+' ocupada'}]}, {...message,role:'user',content:'Valora'}]);
  assert(!tooLong[1].content.includes('"description"'));
});

test('geocode rejects malformed coordinates and overlong queries without a provider request and reports quota',async()=>{
  let calls=0;
  const route=loader({'@/lib/commute':{reverseGeocode:async()=>{calls++;return null},geocodeAddress:async()=>{calls++;return null}}})('app/api/geocode/route.ts');
  for(const query of ['lat=Infinity&lon=0','lat=40bad&lon=-3','lat=91&lon=0','lat=40&lon=181','lat=40','lat=&lon=0','q='+'a'.repeat(301)]) {
    const response=await route.GET({nextUrl:new URL('https://habitia.test/api/geocode?'+query),headers:new Headers()});
    assert.equal(response.status,400,query);
  }
  assert.equal(calls,0);
  const limited=loader({'@/lib/rate-limit':{rateLimit:()=>({ok:false,retryAfter:60})}})('app/api/geocode/route.ts');
  const response=await limited.GET({nextUrl:new URL('https://habitia.test/api/geocode?q=Madrid'),headers:new Headers()});
  assert.equal(response.status,429);assert.equal(response.headers.get('retry-after'),'60');
});

test('mortgage accepts zero interest and rejects nonfinite or string inputs',()=>{
  const {calcularHipoteca}=loader()('lib/agent/tools/calcular-hipoteca.ts');
  const result=calcularHipoteca({precioPropiedad:120000,entradaPorcentaje:0,plazoAnios:10,tipoInteres:0});
  assert.equal(result.monthlyPayment,1000);assert.equal(result.totalInterest,0);assert.equal(result.interestRate,0);
  for(const extra of [{precioPropiedad:Infinity},{precioPropiedad:'120000'},{tipoInteres:NaN},{entradaPorcentaje:'20'},{plazoAnios:Infinity}]) assert.throws(()=>calcularHipoteca({precioPropiedad:120000,...extra}));
});

test('parking essential uses the explicit provider field including a negative observation',()=>{
  const {satisfiesMust}=loader()('lib/personal-score.ts');
  assert.equal(satisfiesMust(property,'garaje'),false);
  assert.equal(satisfiesMust({...property,parkingSpace:{hasParkingSpace:true}},'garaje'),true);
  assert.equal(satisfiesMust({...property,parkingSpace:undefined},'garaje'),null);
});
