/* Auditoría aislada: no red, no credenciales, no escrituras a servicios. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '../..');
const req = createRequire(path.join(root, 'package.json'));
const ts = req('typescript');
const assert = require("node:assert/strict");
let passed = 0;
function check(name, fn) { fn(); passed++; console.log("PASS", name); }

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
  check('retired neighborhood indicators', () => {
    for (const [z, p] of [['', 'Málaga'], ['Centro','Málaga'], ['Salamanca','Madrid']]) {
      const r=load('lib/neighborhood/report.ts').buildNeighborhoodReport(z,p);
      assert.equal(r.seguridad.indice,null); assert.equal(r.zona.encontrada,null);
    }
  });
  const fin = load('lib/finance/rent-vs-buy.ts');
  check('verdict matches final wealth across 324 scenarios', () => {
    for (const price of [150000,300000,600000]) for (const rent of [700,1200,2200]) for (const g of [-3,0,2,4]) for (const i of [4,8,12]) for (const h of [10,20,40]) {
      const r=fin.runCompararAlquilerCompra({precioVivienda:price,alquilerMensual:rent,revalorizacionViviendaAnual:g,rentabilidadInversionAnual:i,horizonteAnios:h,capitalDisponible:200000,subidaAlquilerAnual:0});
      assert.equal(r.veredicto.ganador,r.ventajaCompra>=0?'comprar':'alquilar');
    }
  });
  check('tax exemption requires explicit assumption', () => {
    const a=fin.runCompararAlquilerCompra({viviendaHabitual:true});
    const b=fin.runCompararAlquilerCompra({viviendaHabitual:false});
    assert.equal(a.patrimonioFinalCompra,b.patrimonioFinalCompra);
    const c=fin.runCompararAlquilerCompra({viviendaHabitual:true,exencionGananciaVenta:true});
    assert(c.patrimonioFinalCompra>a.patrimonioFinalCompra);
  });
  const request=body=>new Request('http://localhost/api/test',{method:'POST',body:JSON.stringify(body)});
  let recommendationsRequested = 0;
  const recommendApi = loader({
    '@/lib/rate-limit': { rateLimit: () => ({ ok: true }) },
    '@/lib/recommend': { recommend: async () => { recommendationsRequested++; return { filters: null, items: [] }; } },
  })('app/api/recommend/route.ts');
  for (const confirmSearch of [undefined, false, 'true', 1, null]) {
    const result = await recommendApi.POST(request({ zona: 'Madrid', confirmSearch }));
    assert.equal(result.status, 428);
    assert.equal((await result.json()).code, 'SEARCH_CONFIRMATION_REQUIRED');
  }
  check('recommend rejects missing or non-boolean confirmation before searching', () => assert.equal(recommendationsRequested, 0));
  const confirmed = await recommendApi.POST(request({ zona: 'Madrid', confirmSearch: true }));
  check('explicitly confirmed recommendation proceeds once', () => {
    assert.equal(confirmed.status, 200);
    assert.equal(recommendationsRequested, 1);
  });
  let requestedFilters;
  const filterRecommend = loader({
    '@/lib/idealista/search': { searchProperties: async (filters) => { requestedFilters = filters; return []; } },
  })('lib/recommend.ts');
  const filterProfile = { zona: 'Madrid', operacion: 'alquiler', presupuestoMax: 1500, habitaciones: 2 };
  await filterRecommend.recommend({ profile: filterProfile, precioMax: null, habitaciones: null });
  check('cleared confirmed filters do not silently reuse profile limits', () => {
    assert.equal(requestedFilters.precioMax, undefined);
    assert.equal(requestedFilters.habitaciones, undefined);
  });
  await filterRecommend.recommend({ profile: filterProfile });
  check('omitted overrides retain profile defaults', () => {
    assert.equal(requestedFilters.precioMax, 1500);
    assert.equal(requestedFilters.habitaciones, 2);
  });
  let cloudWrites=0;
  const chatLoad=loader({'@/lib/agent/loop':{executeAgentLoop:async(_,send)=>send({type:'text',text:'Respuesta local de prueba'})},'@/lib/supabase/conversations':{persistTurn:()=>{cloudWrites++;}},'@/lib/rate-limit':{rateLimit:()=>({ok:true})}});
  for (const body of [null,{messages:'wrong'},{messages:[{role:'user',content:42}]},{messages:[{role:'user',content:'x'.repeat(8001)}]}]) {
    const r=await chatLoad('app/api/chat/route.ts').POST(request(body)); assert.equal(r.status,400); passed++;
  }
  const r=await chatLoad('app/api/chat/route.ts').POST(request({messages:[{role:'user',content:'Hola'}],conversationId:'local-test'}));
  const events=(await r.text()).trim().split('\n\n').map(x=>JSON.parse(x.slice(6)));
  check('chat id stable and no cloud persistence',()=>{assert.equal(events[0].id,'local-test');assert.equal(cloudWrites,0);assert(events.some(x=>x.type==='text'));});
  assert.equal((await load('app/api/conversations/route.ts').GET(new Request('http://localhost/api/conversations'))).status,503); passed++;
  assert.equal((await load('app/api/favorites/route.ts').GET()).status,503); passed++;
  const demoValidation = load('lib/supabase/demo.ts');
  const savedDemo = [];
  const demoLoad = loader({
    '@/lib/errors': load('lib/errors.ts'),
    '@/lib/rate-limit': {rateLimit:()=>({ok:true})},
    '@/lib/supabase/demo': {
      demoId: demoValidation.demoId, demoMessages: demoValidation.demoMessages,
      listDemoConversations: async()=>[{id:'demo-one',title:'TFM'}],
      loadDemoConversation: async()=>savedDemo.at(-1)?.messages??[],
      saveDemoConversation: async(id,messages)=>savedDemo.push({id,messages}),
      listDemoFavorites: async()=>[],
      saveDemoFavorite: async(property)=>savedDemo.push({property}),
      removeDemoFavorite: async(code)=>savedDemo.push({removed:code}),
    },
  });
  const demoReq=(body,method='POST',headers={})=>new Request('http://localhost/api/demo',{method,headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
  const demoApi=demoLoad('app/api/conversations/route.ts');
  const demoMessage={id:'message-one',role:'assistant',content:'Demo',createdAt:'2026-09-09T10:00:00Z',properties:[],purchaseValuation:{estado:'no_disponible',propertyCode:'demo'}};
  assert.equal((await demoApi.POST(demoReq({id:'demo-one',messages:[demoMessage]}))).status,200);
  check('shared conversation keeps structured cards',()=>assert.equal(savedDemo[0].messages[0].purchaseValuation.estado,'no_disponible'));
  for(const body of [null,{id:'../private',messages:[demoMessage]},{id:'demo-one',messages:[]},{id:'demo-one',messages:[demoMessage,demoMessage]},{id:'demo-one',messages:[{...demoMessage,role:'system'}]},{id:'demo-one',messages:[{...demoMessage,content:{bad:true}}]},{id:'demo-one',messages:[{...demoMessage,toolCalls:{}}]}]) {
    assert.equal((await demoApi.POST(demoReq(body))).status,400);passed++;
  }
  assert.equal((await demoApi.POST(demoReq({id:'demo-one',messages:[demoMessage]},'POST',{origin:'https://other.invalid'}))).status,403);passed++;
  assert.equal((await demoApi.POST(demoReq({id:'demo-one',messages:[demoMessage]},'POST',{'content-type':'text/plain'}))).status,415);passed++;
  check('invalid shared writes never reach the database',()=>assert.equal(savedDemo.length,1));
  const demoList=await demoApi.GET(new Request('http://localhost/api/conversations'));
  assert.equal(demoList.headers.get('cache-control'),'no-store, max-age=0');
  check('shared history is returned without a user id',()=>assert.equal(demoList.status,200));
  const demoFavApi=demoLoad('app/api/favorites/route.ts');
  assert.equal((await demoFavApi.POST(demoReq({property:{propertyCode:'bad'}}))).status,400);passed++;
  assert.equal((await demoFavApi.DELETE(demoReq({},'DELETE'))).status,400);passed++;
  assert.equal((await demoFavApi.DELETE(demoReq({propertyCode:'demo-one'},'DELETE'))).status,200);passed++;
  check('shared favorite removal is scoped to a property',()=>assert.equal(savedDemo.at(-1).removed,'demo-one'));
  const store=new Map();const win={dispatchEvent(){}};
  const local=loader({}, {localStorage:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},window:win,Event:class{}})('lib/local-conversations.ts');
  check('local history retains all cards across reload',()=>{
    const m=[{id:'one',role:'user',content:'Piso',createdAt:'2026-09-08'},{id:'two',role:'assistant',content:'Resultado',createdAt:'2026-09-08',properties:[{propertyCode:'abc'}],purchaseValuation:{estado:'ok',propertyCode:'abc'}}];
    assert(local.saveLocalConversation('a',m));assert.equal(local.loadLocalConversation('a')[1].properties[0].propertyCode,'abc');assert.equal(local.loadLocalConversation('other').length,0);
    local.clearLocalConversations();assert.equal(local.listLocalConversations().length,0);
  });
  const base={propertyCode:'a',operation:'sale',municipality:'Madrid',propertyType:'flat',latitude:40.42,longitude:-3.70,price:300000,size:80,rooms:2,detailedType:{typology:'flat',subTypology:'duplex'}};
  const model=load('lib/valoracion/client.ts');
  check('municipality/coordinate/type gate and subtype preserved',()=>{
    assert(model.esValorable(base));assert.equal(model.aAnuncio(base).detailedType.subTypology,'duplex');assert.equal(model.aAnuncio(base).municipality,'Madrid');
    assert(!model.esValorable({...base,municipality:'Rozas de Madrid, Las'}));assert(!model.esValorable({...base,latitude:41.38,longitude:2.17}));assert(!model.esValorable({...base,propertyType:'chalet'}));
  });
  let posted;
  const contract={model_version:'2.0.0',objetivo:'precio_anunciado',extrapolacion_temporal:true,precision_actual_validada:false,nivel_precios:'2026T1'};
  const validValuation={...contract,propertyCode:'a',estado:'ok',model_id:'habitIA-oferta-2018-v2',periodo_entrenamiento:'2018',factor_escenario:1.5534,clasificacion_validada:false,advertencias:['Escenario histórico indexado'],precio_justo:250000,intervalo:[200000,300000],brecha_pct:20,banda:'muy_caro',oportunidad:false,sobrevalorado:false};
  const online=loader({}, {process:{env:{VALORACION_URL:'http://model.invalid'}},fetch:async(_url,opts)=>{posted=JSON.parse(opts.body);return Response.json({...contract,resultados:[validValuation],errores:[{indice:1,propertyCode:'b',estado:'fuera_ambito',detalle:'Fuera del soporte'}]});}})('lib/valoracion/client.ts');
  const batch=await online.valorarLoteConEstado([base,{...base,propertyCode:'b'}]);
  check('mixed valuation result/abstention survives',()=>{assert.equal(batch.resultados.size,1);assert.equal(batch.estados.get('b').estado,'fuera_ambito');assert.equal(posted.renivelar,true);});
  for (const change of [{model_version:'1.0.0'},{model_version:undefined},{model_id:'old-model'},{periodo_entrenamiento:'2026'},
    {extrapolacion_temporal:false},{precision_actual_validada:true},{clasificacion_validada:true},{factor_escenario:0},
    {propertyCode:'unsolicited'},{precio_justo:350000},{intervalo:[300000,200000]},{brecha_pct:'20'},
    {explicacion:{factores:'wrong',no_causal:true,escala:'log_euros_2018'}}]) {
    const invalid=loader({}, {process:{env:{VALORACION_URL:'http://model.invalid'}},fetch:async()=>Response.json({...contract,resultados:[{...validValuation,...change}]})})('lib/valoracion/client.ts');
    const result=await invalid.valorarLoteConEstado([base]);assert.equal(result.resultados.size,0);assert.equal(result.estados.get('a').estado,'no_disponible');passed++;
  }
  for (const response of [{resultados:[validValuation]},{...contract,extrapolacion_temporal:false,resultados:[validValuation]},{...contract,resultados:[validValuation,validValuation]}]) {
    const invalid=loader({}, {process:{env:{VALORACION_URL:'http://model.invalid'}},fetch:async()=>Response.json(response)})('lib/valoracion/client.ts');
    const result=await invalid.valorarLoteConEstado([base]);assert.equal(result.resultados.size,0);assert.equal(result.estados.get('a').estado,'no_disponible');passed++;
  }
  console.log('PASS rejects legacy, incompatible, unrequested, duplicate and invalid-interval results');
  const no=await model.valorarLoteConEstado([base]);check('unavailable model explicit',()=>assert.equal(no.estados.get('a').estado,'no_disponible'));
  const fixtures=load('lib/market/fixtures.ts');
  const db={from(){return this;},select(){return this;},eq(){return this;},maybeSingle:async()=>({data:{data:JSON.parse(JSON.stringify(fixtures.FALLBACK_PRICE_BY_PROVINCE)),updated_at:'2026-09-08'},error:null})};
  const cached=await loader({'@/lib/supabase/server':{getServerSupabase:()=>db}})('lib/market/cache.ts').getMarketData('ine_price_by_province');
  check('stored fixture remains labeled fallback',()=>assert(cached.fromFallback));
  let calls=0;
  const search=loader({'@/lib/supabase/server':{getServerSupabase:()=>null}})('lib/idealista/search-cache.ts');
  await Promise.all([search.cachedSearch('same',async()=>{calls++;return [base];}),search.cachedSearch('same',async()=>{calls++;return [base];})]);await search.cachedSearch('same',async()=>{calls++;return [base];});
  check('search cache deduplicates concurrent/repeated same inputs',()=>assert.equal(calls,1));
  for (const fake of [null,{rpc:async()=>({error:{message:'missing migration'}})},{rpc:async()=>({data:[{allowed:false,used:100}],error:null})}]) {
    const quota=loader({'@/lib/supabase/server':{getServerSupabase:()=>fake}})('lib/idealista/usage.ts');await assert.rejects(quota.reserveIdealistaRequest());passed++;
  }
  const quota=loader({'@/lib/supabase/server':{getServerSupabase:()=>({rpc:async()=>({data:[{allowed:true,used:1}],error:null})})}})('lib/idealista/usage.ts');await quota.reserveIdealistaRequest();passed++;
  const api=load('app/api/valoracion/route.ts');
  for(const body of [null,{properties:Array(25).fill(base)},{properties:[{...base,price:-1}]}]) {assert.equal((await api.POST(request(body))).status,400);passed++;}
  const normalize = load('lib/idealista/search.ts').normalizeProperty;
  check('Idealista adapter retains observed detailedType without inferred penthouse',()=>{
    const n=normalize({propertyCode:'a',price:300000,size:80,rooms:2,propertyType:'flat',operation:'sale',municipality:'Madrid',detailedType:{typology:'flat',subTypology:'duplex'},floor:'5'},'venta');
    assert.equal(n.detailedType.subTypology,'duplex');assert.equal(n.propertyType,'flat');assert.equal(n.sourceKind,'idealista');
  });
  check('unknown rooms survive normalization and model adapter; observed zero survives',()=>{
    const missing=normalize({propertyCode:'missing',price:300000,size:80,propertyType:'flat',operation:'sale',municipality:'Madrid'},'venta');
    assert.equal(missing.rooms,undefined);assert.equal(model.aAnuncio(missing).rooms,undefined);
    assert.equal(model.aAnuncio(normalize({...missing,rooms:0},'venta')).rooms,0);
    assert(!model.esValorable({...base,latitude:40.60}));
  });
  check('Madrid flat demos are in scope, explicitly synthetic, illustrated and unlinked',()=>{
    const mocks=load('lib/idealista/mock.ts').mockSearch({zona:'Madrid',operacion:'venta',tipo:'pisos',precioMax:400000});
    assert(mocks.length>0);
    for(const p of mocks) {assert(model.esValorable(p));assert.equal(p.sourceKind,'demo');assert.equal(p.thumbnail,'/property-demo.svg');assert.equal(p.url,'');}
  });
  const enrich=loader({'@/lib/market/cache':{getMarketData:async()=>({data:{data:[]},fromFallback:false})},'@/lib/market/match-province':{findProvincePrice:()=>({precioM2:4048,provincia:'Madrid'})},'@/lib/valoracion/client':{valorarLoteConEstado:async()=>({resultados:new Map(),estados:new Map([['a',{estado:'no_disponible',motivo:'Servicio apagado'}]])})}})('lib/enrich.ts');
  const neutral=await enrich.enrichProperties([base]);
  check('model failure retains provenance but never a territorial individual price band',()=>{
    assert.equal(neutral[0].valuation.referenciaEurM2,4048);assert.equal(neutral[0].valuation.banda,null);
    assert.equal(neutral[0].valuation.diferenciaPorcentual,null);assert.equal(neutral[0].valuation.estadoModelo,'no_disponible');
  });
  const modelAndFixture=loader({'@/lib/market/cache':{getMarketData:async key=>({data:key==='rent_reference'?fixtures.FALLBACK_RENT_REFERENCE:fixtures.FALLBACK_PRICE_BY_PROVINCE,fromFallback:true})},'@/lib/valoracion/client':{valorarLoteConEstado:async()=>({resultados:new Map([['a',validValuation]]),estados:new Map([['a',{estado:'ok',motivo:'Escenario histórico'}]])})}})('lib/enrich.ts');
  const onlyModel=await modelAndFixture.enrichProperties([base]);
  check('successful model plus market fixture never shows territorial comparison or false source',()=>{
    assert.equal(onlyModel[0].valuation.nivel,'modelo');assert.equal(onlyModel[0].valuation.comparativa,undefined);
    assert.equal(onlyModel[0].valuation.referenciaEurM2,3125);assert.equal(onlyModel[0].valuation.modeloVersion,'2.0.0');
  });
  let callsBlocked=0;
  const paused=loader({'./auth':{getAccessToken:async()=>'test'},'./usage':{reserveIdealistaRequest:async()=>{throw new Error('quota paused');}},'./search-cache':{cachedSearch:async(_,run)=>run()}},{fetch:async()=>{callsBlocked++;throw new Error('must not fetch');}})('lib/idealista/search.ts');
  await assert.rejects(paused.searchProperties({zona:'Madrid',operacion:'venta',centro:{lat:40.42,lon:-3.7}}));
  check('quota refusal prevents paid search fetch',()=>assert.equal(callsBlocked,0));
  let toolArgs;
  const valuationTool=loader({'@/lib/valoracion/client':{valorarLoteConEstado:async(props,opts)=>{toolArgs={props,opts};return {resultados:new Map(),estados:new Map([['a',{estado:'no_disponible',motivo:'Servicio apagado'}]])};}}})('lib/agent/tools/valorar-vivienda.ts');
  const toolResult=await valuationTool.runValorarVivienda(base);
  check('chat tool uses shared backend and preserves abstention',()=>{assert.equal(toolArgs.props[0].detailedType.subTypology,'duplex');assert.equal(toolArgs.opts.explicar,true);assert.equal(toolResult.estado,'no_disponible');assert.equal(toolResult.resultado,null);});
  await valuationTool.runValorarVivienda({...base,rooms:undefined});
  check('chat valuation preserves missing rooms',()=>assert.equal(toolArgs.props[0].rooms,undefined));
  const rec=loader({'@/lib/idealista/search':{searchProperties:async()=>[{...base,propertyCode:'bad',hasLift:false},{...base,propertyCode:'good',hasLift:true}]},'@/lib/enrich':{enrichProperties:async()=>[]},'@/lib/ai-insights':{narrateRecommendations:async()=>null}})('lib/recommend.ts');
  const rr=await rec.recommend({profile:{operacion:'venta',zona:'Madrid',imprescindibles:['ascensor']}});
  check('known essential mismatch excluded',()=>{assert.equal(rr.items.length,1);assert.equal(rr.items[0].property.propertyCode,'good');});
  console.log(JSON.stringify({status:'passed',checks:passed,network:'blocked',externalWrites:0},null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
