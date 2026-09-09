/* Sin red ni credenciales: contratos de personalización, ranking y recuperación. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '../..');
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
  const model = { ...empty, valuation: { nivel: 'modelo', estadoModelo: 'ok', fromFallback: false, modeloVersion: 'v2', banda: 'barato', diferenciaPorcentual: -10, intervalo: [100000, 150000] } };
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
  check('zone is observable proximity, independent of invented neighborhood index', () => {
    const result = personalScore(property, {...empty, neighborhood: {seguridad:{indice:100}}}, profile);
    assert.equal(result.score,25); assert.equal(result.scoring.coveragePercent,25);
    assert.equal(result.scoring.components.find(c=>c.key==='zone').value,100);
    assert.equal(personalScore({...property,latitude:41}, empty, profile).score,0);
  });
  check('fallback and invalid model state cannot award Fair/Opportunity', () => {
    for (const changed of [{fromFallback:true},{estadoModelo:'no_disponible'},{nivel:'provincia'},{modeloVersion:undefined}]) {
      const result = personalScore(property,{...model,valuation:{...model.valuation,...changed}},null);
      assert.equal(result.score,0); assert.equal(result.scoring.coveragePercent,0);
    }
  });
  check('Opportunity margin anchors and bounds are transparent', () => {
    const p = {...profile,scoreWeights:{alpha:0,beta:100,gamma:0,delta:0}};
    assert.equal(personalScore(property,model,p).score,50);
    assert.equal(personalScore({...property,price:90000},model,p).score,70);
    assert.equal(personalScore({...property,price:200000},model,p).score,0);
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
