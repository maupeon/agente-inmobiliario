/* Isolated API tests: no credentials, remote writes or provider requests. */
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');
const ts = require('typescript');
const root = path.resolve(__dirname, '../..');
let checks = 0;
function ok(name, fn) { fn(); checks++; console.log('PASS', name); }
function loader(stubs = {}, env = {}) {
  const cache = new Map();
  function load(name) {
    let file = path.resolve(root, name); if (!fs.existsSync(file)) file += '.ts';
    if (cache.has(file)) return cache.get(file).exports;
    const mod = { exports: {} }; cache.set(file, mod);
    const code = ts.transpileModule(fs.readFileSync(file,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
    function localRequire(id) {
      if (Object.hasOwn(stubs,id)) return stubs[id];
      if (id==='server-only') return {};
      if (id.startsWith('@/')) return load(id.slice(2));
      if (id.startsWith('.')) return load(path.resolve(path.dirname(file),id));
      return require(id);
    }
    vm.runInNewContext(code,{ module:mod,exports:mod.exports,require:localRequire,process:{env},console:{error:()=>{}},Buffer,Response,Request,URL,TextEncoder,TextDecoder,Intl,AbortSignal,setTimeout,clearTimeout,fetch:()=>{throw Error('NETWORK BLOCKED')} },{filename:file});
    return mod.exports;
  }
  return load;
}
async function main() {
  const cookiesStub={cookies:()=>({get:()=>undefined})};
  const server=loader({'next/headers':cookiesStub},{CRON_SECRET:'x'.repeat(32)})('lib/notifications/server.ts');
  ok('cron always rejects missing or malformed authorization',()=>{
    for (const auth of ['', 'Bearer wrong', 'bearer '+'x'.repeat(32)]) assert.equal(server.validCronAuthorization(new Request('https://habitia.test',{headers:{authorization:auth}})),false);
    assert.equal(server.validCronAuthorization(new Request('https://habitia.test',{headers:{authorization:'Bearer '+'x'.repeat(32)}})),true);
    assert.equal(loader({'next/headers':cookiesStub},{CRON_SECRET:'short'})('lib/notifications/server.ts').validCronAuthorization(new Request('https://habitia.test',{headers:{authorization:'Bearer short'}})),false);
  });
  ok('private random identity is server issued and only hash is used in database',()=>{
    const a=server.notificationIdentity(true), b=server.notificationIdentity(true);
    assert.match(a.token,/^[a-f0-9]{64}$/); assert.notEqual(a.token,b.token);assert.notEqual(a.hash,a.token);
    const response=server.notificationResponse({},a);const cookie=response.headers.get('set-cookie');
    assert.match(cookie,/HttpOnly/i);assert.match(cookie,/SameSite=strict/i);assert.match(response.headers.get('cache-control'),/no-store/);
    assert.equal(server.notificationIdentity(),null);
  });
  const validation=loader()('lib/notifications/types.ts');
  ok('time and timezone validation',()=>{
    for (const t of ['07:00','00:00','23:59']) assert.equal(validation.validNotificationTime(t),true);
    for (const t of ['24:00','7:00','07:60',7,null]) assert.equal(validation.validNotificationTime(t),false);
    assert.equal(validation.validTimeZone('Europe/Madrid'),true);assert.equal(validation.validTimeZone('Atlantic/Canary'),true);assert.equal(validation.validTimeZone('fake zone'),false);
  });
  let recommendations=0, completes=[], allow=true, claim=true, fail=false, dbCalls=0;
  const db={from:()=>({select:()=>({limit:async()=>({error:null})})}),rpc:async(name,args)=>{dbCalls++;if(name==='claim_notification_subscription')return {data:claim?[{owner_hash:'a'.repeat(64),profile:{zona:'Madrid',operacion:'alquiler'}}]:[],error:null}; completes.push(args);return {data:true,error:null};}};
  const worker=loader({
    '@/lib/notifications/server':{validCronAuthorization:()=>allow,PRIVATE_HEADERS:{'Cache-Control':'private, no-store'},notificationDb:()=>db},
    '@/lib/recommend':{recommend:async(input)=>{recommendations++;assert.equal(input.narrate,false);if(fail)throw Error('secret provider details');return {items:[{property:{propertyCode:'a'},score:40},{property:{propertyCode:'b'},score:90},{property:{propertyCode:'a'},score:40},{property:{propertyCode:'c'},score:80},{property:{propertyCode:'d'},score:70}]};}},
  },{NEXT_PUBLIC_SUPABASE_URL:'https://abcdefghijklmnopqrst.supabase.co'})('app/api/cron/recommendations/route.ts');
  allow=false;const denied=await worker.GET(new Request('https://habitia.test'));
  ok('unauthorized cron performs no database or provider work',()=>{assert.equal(denied.status,401);assert.equal(dbCalls,0);});
  allow=true;
  const health=await worker.GET(new Request('https://habitia.test?check=1'));const healthBody=await health.json();
  ok('authenticated readiness identifies project without claiming or searching',()=>{assert.equal(health.status,200);assert.equal(healthBody.projectRef,'abcdefghijklmnopqrst');assert.equal(healthBody.mode,'check');assert.equal(recommendations,0);assert.equal(dbCalls,0);});
  claim=false;const empty=await worker.GET(new Request('https://habitia.test'));
  ok('no due profile performs no search',()=>{assert.equal(empty.status,200);assert.equal(recommendations,0);});
  claim=true;const run=await worker.GET(new Request('https://habitia.test'));
  ok('worker selects exactly top3 distinct properties and disables narration',()=>{assert.equal(run.status,200);assert.equal(recommendations,1);assert.equal(completes[0].p_items.map(x=>x.property.propertyCode).join(','),'b,c,d');assert.equal(completes[0].p_error,null);});
  fail=true;const failure=await worker.GET(new Request('https://habitia.test'));
  ok('failed provider gets a safe retry result without fabricated selection',()=>{assert.equal(failure.status,503);assert.equal(completes[1].p_items.length,0);assert(!completes[1].p_error.includes('secret'));});
  let ownerFilters=[];
  const query={select(){return this},eq(key,value){ownerFilters.push([key,value]);return this},maybeSingle:async()=>({data:null,error:null}),order(){return this},limit:async()=>({data:[],error:null})};
  const read=loader({'next/headers':cookiesStub,'@/lib/supabase/server':{getServerSupabase:()=>({from:()=>query})}})('lib/notifications/server.ts');
  const state=await read.readNotificationState('owner-A');
  ok('settings and inbox reads both filter private owner',()=>{assert.equal(ownerFilters.length,2);assert(ownerFilters.every(([k,v])=>k==='owner_hash'&&v==='owner-A'));assert.equal(state.settings.enabled,false);assert.equal(state.settings.time,'07:00');});
  const api=loader({'next/headers':cookiesStub,'@/lib/rate-limit':{rateLimit:()=>({ok:true})}})('app/api/notifications/route.ts');
  const req=(body,origin='https://habitia.test')=>new Request('https://habitia.test/api/notifications',{method:'PUT',headers:{'content-type':'application/json',origin},body:JSON.stringify(body)});
  const valid={enabled:true,time:'07:00',timeZone:'Europe/Madrid',profile:{operacion:'alquiler',zona:'Madrid'}};
  const invalid=await api.PUT(req({...valid,time:'24:00'}));const crossOrigin=await api.PUT(req(valid,'https://evil.test'));const missingCookie=await api.PUT(req(valid));
  ok('settings reject invalid time, cross-origin writes and missing identity',()=>{assert.equal(invalid.status,400);assert.equal(crossOrigin.status,403);assert.equal(missingCookie.status,401);});
  console.log(`${checks} notification API groups passed`);
}
main().catch(e=>{console.error(e);process.exitCode=1;});
