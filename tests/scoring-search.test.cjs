/* Sin red ni credenciales: contratos de personalización, ranking y recuperación. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const req = createRequire(path.join(root, 'package.json'));
const ts = req('typescript');
function loader(stubs = {}, globals = {}) {
  const cache = new Map();
  function load(file) {
    file = path.isAbsolute(file) ? file : path.join(root, file);
    if (!fs.existsSync(file)) file += '.ts';
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} }; cache.set(file, module);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    vm.runInNewContext(code, { module, exports: module.exports, require(id) {
      if (Object.hasOwn(stubs, id)) return stubs[id];
      if (id === 'server-only') return {};
      if (id.startsWith('@/')) return load(id.slice(2));
      if (id.startsWith('.')) return load(path.resolve(path.dirname(file), id));
      return req(id);
    }, console, Event, Date, process: { env: {} }, ...globals }, { filename: file });
    return module.exports;
  }
  return load;
}
let checks = 0;
function check(name, fn) { fn(); checks++; console.log('PASS', name); }
async function main() {
  const load = loader();
  const { personalScore, validScoreWeights, scoreWeights, satisfiesMust } = load('lib/personal-score.ts');
  const profile = { operacion: 'venta', zona: 'Madrid', createdAt: '2026-09-09', zonaLat: 40.4, zonaLon: -3.7 };
  const property = { propertyCode: 'one', title: 'Vivienda', price: 100000, size: 60, propertyType: 'flat', operation: 'sale', latitude: 40.4, longitude: -3.7 };
  const empty = { propertyCode: 'one', valuation: null, neighborhood: null, commute: null };
  const model = { ...empty, valuation: { nivel: 'modelo', estadoModelo: 'ok', fromFallback: false, modeloVersion: 'v2', operacion: 'venta', precioEstimado: 100000 / 0.9, banda: 'barato', diferenciaPorcentual: -10, intervalo: [100000, 150000] } };
  const { fairFromGap, fairForProperty, opportunityFromGrowth, opportunityForProperty } = load('lib/scoring/price-scores.ts');
  check('Fair has monotonic, bounded scores independent of model bands', () => {
    for (const [gap, expected] of [[-80,100],[-20,100],[-10,75],[0,50],[10,25],[20,0],[300,0]]) assert.equal(fairFromGap(gap),expected);
    for (const gap of [null,NaN,Infinity,-Infinity]) assert.equal(fairFromGap(gap),null);
    const e={...model,valuation:{...model.valuation,banda:null,diferenciaPorcentual:999}};
    assert.equal(Math.round(fairForProperty(property,e).score),75);
    assert.equal(Math.round(personalScore(property,e,null).scoring.components[0].value),75);
    for(const changed of [{precioEstimado:0},{precioEstimado:NaN},{precioEstimado:undefined},{operacion:'alquiler'},{fromFallback:true},{estadoModelo:'no_disponible'},{nivel:'provincia'},{modeloVersion:undefined}]) assert.equal(fairForProperty(property,{...e,valuation:{...e.valuation,...changed}}),null);
    assert.equal(fairForProperty(property,{...e,propertyCode:'different'}),null);
    for(const price of [0,-1,NaN,Infinity]) assert.equal(fairForProperty({...property,price},e),null);
    const rental=fairForProperty({...property,operation:'rent',price:900},{...e,valuation:{...e.valuation,operacion:'alquiler',precioEstimado:1000}});
    assert.equal(Math.round(rental.score),75); assert.equal(rental.unit,'€/mes');
  });
  check('Opportunity measures growth differences, including zero or negative city growth', () => {
    for(const [district,city,expected] of [[10,10,50],[10,0,75],[0,10,25],[-5,-10,62.5],[-10,-5,37.5],[30,0,100],[-30,0,0]]) assert.equal(opportunityFromGrowth(district,city),expected);
    for(const value of [null,NaN,Infinity,-100]) {assert.equal(opportunityFromGrowth(value,0),null);assert.equal(opportunityFromGrowth(0,value),null);}
    const p={...property,municipality:'Madrid',district:'Centro'};
    const result=opportunityForProperty(p);
    assert.equal(result.districtGrowthPercent,3.3); assert.equal(result.cityGrowthPercent,2.2);
    assert.equal(result.score,52.75); assert.equal(result.scope,'distrito');
    assert.equal(opportunityForProperty({...p,price:2000000}).score,result.score);
    for(const changed of [{operation:'rent'},{district:undefined},{district:'Malasaña'},{district:'Centro histórico'},{municipality:'Málaga'},{latitude:41.38,longitude:2.17}]) assert.equal(opportunityForProperty({...p,...changed}),null);
    for(const district of ['Salamanca','Barrio de Salamanca','04']) assert.equal(opportunityForProperty({...p,district}).districtCode,'04');
    const source=load('lib/scoring/opportunity-data.ts');
    assert.equal(source.OPPORTUNITY_DISTRICTS.length,21);
    assert.equal(new Set(source.OPPORTUNITY_DISTRICTS.map(d=>d.code)).size,21);
    assert(source.OPPORTUNITY_DISTRICTS.every(d=>opportunityForProperty({...p,district:d.code})?.score != null));
    const scored=personalScore(p,model,{...profile,scoreWeights:{alpha:50,beta:50,gamma:0,delta:0}});
    assert.equal(scored.scoring.coveragePercent,100); assert.equal(scored.score,64);
  });
  check('weights default25, extremes and strict total', () => {
    assert.equal(scoreWeights(undefined).alpha, 25);
    assert(validScoreWeights({alpha:100,beta:0,gamma:0,delta:0}));
    for (const w of [null, {}, {alpha:25,beta:25,gamma:25,delta:24}, {alpha:-1,beta:26,gamma:25,delta:50}, {alpha:0.5,beta:49.5,gamma:25,delta:25}, {alpha:'25',beta:25,gamma:25,delta:25}]) assert(!validScoreWeights(w));
  });
  check('missing evidence remains null and cannot manufacture neutral points', () => {
    const result = personalScore(property, empty, null);
    assert.equal(result.score, 0);
    assert.equal(result.scoring.coveragePercent, 0);
    assert(result.scoring.components.every(c => c.value === null && c.contribution === 0));
  });
  check('Zone stays unavailable: proximity and manual indices cannot stand in for quality of life', () => {
    const result = personalScore(property, {...empty, neighborhood: {seguridad:{indice:100},calidadVida:{indice:100}}}, profile);
    assert.equal(result.score,0); assert.equal(result.scoring.coveragePercent,0);
    assert.equal(result.scoring.components.find(c=>c.key==='zone').value,null);
  });
  const { percentileRank, calculateZone, zoneForProperty } = load('lib/neighborhood/zone-score.ts');
  const { evaluationLabel } = load('lib/score-presentation.ts');
  const districtRows = [
    {code:'a',district:'A',green:0,actions:30,transport:0,services:0,noise:70},
    {code:'b',district:'B',green:10,actions:20,transport:1,services:10,noise:60},
    {code:'c',district:'C',green:20,actions:10,transport:2,services:20,noise:50},
  ];
  check('Zone directions follow all five proposed rules, with identical internal weights', () => {
    assert.equal(calculateZone('a',districtRows).score,0);
    assert.equal(calculateZone('b',districtRows).score,50);
    const best=calculateZone('c',districtRows);
    assert.equal(best.score,100); assert.equal(best.coveragePercent,100);
    assert(best.indicators.every(i=>i.index===1 && i.points===20));
  });
  check('percentiles use average ranks for ties and reject invalid or incomplete distributions', () => {
    assert.equal(percentileRank(0,[0,10,20,20]),0);
    assert.equal(percentileRank(20,[0,10,20,20]),5/6);
    assert.equal(percentileRank(7,[7,7,7]),0.5);
    for(const ref of [[10], [null,10], [NaN,10], [-1,10], [Infinity,10]]) assert.equal(percentileRank(10,ref),null);
    assert.equal(percentileRank(null,[0,10]),null);
    assert.equal(percentileRank(8,[0,10]),null);
  });
  check('missing noise stays null and preserves the fifth weight instead of making an 80 into 100', () => {
    const partial=calculateZone('c',districtRows.map(d=>({...d,noise:null})));
    assert.equal(partial.score,80); assert.equal(partial.coveragePercent,80); assert.equal(partial.available,4);
    const noise=partial.indicators.find(i=>i.key==='noise');
    assert.equal(noise.rawValue,null); assert.equal(noise.index,null); assert.equal(noise.points,null);
    const incomplete=calculateZone('c',districtRows.map(d=>({...d,noise:null,transport:d.code==='a'?null:d.transport})));
    assert.equal(incomplete.score,60); assert.equal(incomplete.coveragePercent,60);
    assert.equal(incomplete.indicators.find(i=>i.key==='transport').index,null);
    const none=calculateZone('c',districtRows.map(d=>({...d,green:null,actions:null,transport:null,services:null,noise:null})));
    assert.equal(none.score,null); assert.equal(none.coveragePercent,0);
    assert.equal(calculateZone('missing',districtRows),null);
    assert.equal(calculateZone('a',[...districtRows,districtRows[0]]),null);
  });
  const madridProperty={...property,municipality:'Madrid',district:'Centro'};
  check('Zone identifies only an explicit Madrid district, and never the profile or a similar name', () => {
    const zone=zoneForProperty(madridProperty);
    assert.equal(zone.district,'Centro'); assert.equal(zone.scope,'distrito'); assert.equal(zone.available,4);
    assert.equal(zoneForProperty({...madridProperty,district:' Chamberí '}).districtCode,'07');
    for(const changed of [{district:undefined},{district:'Centro histórico'},{district:'Malasaña'},{municipality:'Málaga'},{latitude:41.38,longitude:2.17}]) {
      assert.equal(zoneForProperty({...madridProperty,...changed}),null);
    }
    const withoutDistrict=personalScore(property,empty,{...profile,zona:'Centro'});
    assert.equal(withoutDistrict.scoring.zone,null);
  });
  check('Zone covers only its available fraction of the user weight, for sale and rental', () => {
    for(const operation of ['sale','rent']) {
      const result=personalScore({...madridProperty,operation},empty,{...profile,scoreWeights:{alpha:0,beta:0,gamma:100,delta:0}});
      assert.equal(result.scoring.coveragePercent,80);
      assert.equal(result.scoring.components.find(c=>c.key==='zone').coveragePercent,80);
      assert.equal(evaluationLabel(result.scoring),'Evaluación parcial');
      assert.equal(result.score,Math.round(result.scoring.zone.score));
    }
    const travel={...empty,commute:{recomendado:'bici',proveedor:'estimacion',modos:[{modo:'bici',minutos:26}]}};
    const p={...profile,trabajo:{direccion:'Trabajo',modo:'bici'},scoreWeights:{alpha:20,beta:20,gamma:30,delta:30}};
    const combined=personalScore(madridProperty,travel,p);
    assert.equal(combined.scoring.coveragePercent,74);
    const onlyTravel=personalScore(property,travel,p);
    assert.equal(onlyTravel.score,21);
    assert.equal(evaluationLabel(onlyTravel.scoring),'Evaluación parcial: solo trayecto disponible');
    const zeroWeight=personalScore(madridProperty,travel,{...p,scoreWeights:{alpha:0,beta:0,gamma:0,delta:100}});
    assert.equal(zeroWeight.scoring.coveragePercent,100);
    assert.equal(evaluationLabel(zeroWeight.scoring),'HabitIA Score');
    assert.equal(evaluationLabel(personalScore(property,empty,null).scoring),'Evaluación sin datos');
  });
  check('Zone source snapshot counts each Metro line once per district and keeps noise absent', () => {
    const urban=req('./data/madrid/urban-sources.json');
    const rows=load('lib/neighborhood/zone-data.ts').ZONE_DISTRICTS;
    assert.equal(rows.length,21);
    for(const district of rows) {
      const lines=new Set(urban.metro.estaciones.filter(s=>s.municipio==='079'&&s.distrito===district.code&&s.nombre!=='Sin nombre en el catálogo').flatMap(s=>s.lineas.split(',').map(l=>l.trim())));
      assert.equal(district.transport,lines.size);
      assert.equal(district.noise,null);
      const services=urban.locales.distritos.find(d=>d.code===district.code);
      assert(district.services<=services.alimentacion+services.farmacias+services.gimnasios+services.ocio);
      assert(district.services>=Math.max(services.alimentacion,services.farmacias,services.gimnasios,services.ocio));
    }
    assert.equal(rows.find(d=>d.code==='01').services,2017);
  });
  check('fallback and invalid model state cannot award Fair/Opportunity', () => {
    for (const changed of [{fromFallback:true},{estadoModelo:'no_disponible'},{nivel:'provincia'},{modeloVersion:undefined}]) {
      const result = personalScore(property,{...model,valuation:{...model.valuation,...changed}},null);
      assert.equal(result.score,0); assert.equal(result.scoring.coveragePercent,0);
    }
  });
  check('Opportunity never uses the price margin as relative zone appreciation', () => {
    const p = {...profile,scoreWeights:{alpha:0,beta:100,gamma:0,delta:0}};
    for (const price of [100000,90000,200000]) {
      const r=personalScore({...property,price},model,p);
      assert.equal(r.score,0); assert.equal(r.scoring.coveragePercent,0);
      assert.equal(r.scoring.components.find(c=>c.key==='opportunity').value,null);
    }
  });
  check('Lifestyle scores only work travel time, including bounds and missing values', () => {
    const p={...profile,trabajo:{direccion:'Trabajo',modo:'bici'},presupuestoMax:200000,imprescindibles:['ascensor'],scoreWeights:{alpha:0,beta:0,gamma:0,delta:100}};
    const travel=minutes=>({...empty,commute:{recomendado:'bici',proveedor:'estimacion',modos:[{modo:'bici',minutos:minutes}]}});
    for(const [minutes,expected] of [[0,100],[10,100],[20,81],[60,5],[90,5],[null,0],[-1,0],[NaN,0]]) {
      assert.equal(personalScore(property,travel(minutes),p).score,expected);
    }
    assert.equal(personalScore({...property,hasLift:true},empty,p).score,0);
    const r=personalScore(property,{...model,commute:travel(20).commute},{...p,scoreWeights:{alpha:25,beta:25,gamma:25,delta:25}});
    assert.equal(r.score,39); assert.equal(r.scoring.coveragePercent,50);
  });
  check('absent feature stays unknown, explicit negative fails requirement', () => {
    assert.equal(satisfiesMust({...property,features:['Exterior']},'terraza'),null);
    assert.equal(satisfiesMust({...property,features:['Sin terraza']},'terraza'),false);
    assert.equal(satisfiesMust({...property,features:['Con terraza']},'terraza'),true);
  });
  check('invalid API weights reject and household/pet are preserved', () => {
    const validate = load('lib/api-validation.ts').validatedProfile;
    assert.throws(()=>validate({...profile,scoreWeights:{alpha:30,beta:30,gamma:30,delta:30}}));
    const saved = validate({...profile,hogar:'familia',mascota:true});
    assert.equal(saved.hogar,'familia'); assert.equal(saved.mascota,true); assert.equal(saved.scoreWeights.delta,25);
  });
  check('territorial references never get Barato/Justo/Caro', () => {
    const {priceLabel,priceComparison} = load('lib/dashboard-format.ts');
    assert.equal(priceLabel({...model.valuation,nivel:'provincia'}),null);
    assert.equal(priceLabel(model.valuation),'Barato');
    assert(priceComparison(model.valuation).includes('10% por debajo'));
  });
  const store = new Map(); let events=0;
  const searches = loader({}, {window:{dispatchEvent(){events++;}},localStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)}})('lib/last-search.ts');
  check('dashboard snapshot restores filters and recs; empty replaces previous results', () => {
    const filters={zona:'Madrid',operacion:'venta',precioMax:200000};
    assert(searches.saveLastSearch([property],{source:'dashboard',filters,recommendations:[{property,enrichment:empty,score:0}]}));
    const restored=searches.readLastSearch();
    assert.equal(restored.properties[0].propertyCode,'one'); assert.equal(restored.filters.precioMax,200000); assert.equal(restored.recommendations.length,1);
    searches.saveLastSearch([],{source:'dashboard',filters});
    assert.equal(searches.readLastSearch().properties.length,0); assert.equal(events,2);
  });
  check('corrupt snapshot does not crash and falls back to compatible key', () => {
    store.set('habitia:lastSearch:v1','null');
    assert.equal(searches.readLastSearch().properties.length,0);
  });
  let narrationCalls=0;
  const recommendation = loader({
    '@/lib/idealista/search':{searchProperties:async()=>[{...property,propertyCode:'cheap',hasLift:true},{...property,propertyCode:'near',latitude:40.4,price:120000,hasLift:true},{...property,propertyCode:'reject',hasLift:false}]},
    '@/lib/enrich':{enrichProperties:async(ps)=>ps.map(p=>({...model,propertyCode:p.propertyCode,valuation:{...model.valuation,banda:p.propertyCode==='cheap'?'barato':'caro'}}))},
    '@/lib/ai-insights':{narrateRecommendations:async()=>{narrationCalls++;return null;}},
  })('lib/recommend.ts');
  const result = await recommendation.recommend({profile:{...profile,imprescindibles:['ascensor'],scoreWeights:{alpha:100,beta:0,gamma:0,delta:0}},narrate:false});
  check('server ranking descends by user weights, filters known mismatches and disables paid narration',()=>{
    assert.equal(result.items.length,2); assert.equal(result.items[0].property.propertyCode,'cheap');
    assert(result.items[0].score>result.items[1].score); assert.equal(narrationCalls,0);
  });
  const tooExpensive = await recommendation.recommend({profile:{...profile,presupuestoMax:1},narrate:false});
  check('provider or demo candidates above explicit budget cannot leak into results', () => assert.equal(tooExpensive.items.length,0));
  console.log(JSON.stringify({status:'passed',checks,network:'blocked',externalWrites:0}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
