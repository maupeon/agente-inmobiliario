/** Scoped Supabase setup; never prints credentials or profile contents.
 * node scripts/setup-notifications.mjs --check | --migrate | --upgrade-five | --activate-cron
 * Uses SUPABASE_ACCESS_TOKEN or the existing macOS Supabase CLI keyring entry.
 */
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
async function main() {
const local = {};
try { for (const line of fs.readFileSync('.env.local', 'utf8').split('\n')) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match) local[match[1]] = match[2].trim().replace(/^(["'])(.*)\1$/, '$2');
} } catch { /* CI uses environment */ }
const config = { ...local, ...process.env };
const action = process.argv[2] ?? '--check';
if (!['--check', '--migrate', '--upgrade-five', '--activate-cron'].includes(action)) throw Error('Use --check, --migrate, --upgrade-five or --activate-cron');
let token = config.SUPABASE_ACCESS_TOKEN;
if (!token && process.platform === 'darwin') {
  for (const account of ['supabase', 'access-token']) {
    try { token = execFileSync('security', ['find-generic-password', '-s', 'Supabase CLI', '-a', account, '-w'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); break; } catch { /* try legacy CLI account */ }
  }
}
if (!token) throw Error('Sign in with supabase login, or set SUPABASE_ACCESS_TOKEN privately in your environment.');
// go-keyring encodes values written to macOS Keychain. Decode only in memory.
if (token.startsWith('go-keyring-base64:')) token = Buffer.from(token.slice('go-keyring-base64:'.length), 'base64').toString('utf8');
else if (token.startsWith('go-keyring-encoded:')) token = Buffer.from(token.slice('go-keyring-encoded:'.length), 'hex').toString('utf8');
const project = new URL(config.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
if (!/^[a-z]{20}$/.test(project)) throw Error('Invalid project URL');
async function management(route, body) {
  const response = await fetch(`https://api.supabase.com/v1/${route}`, {
    method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) throw Error(`Supabase management request failed (${response.status}); no credentials or server body are logged.`);
  return response.json();
}
const projects = await management('projects');
if (!projects.some((p) => p.id === project || p.ref === project)) throw Error(`The signed-in account cannot administer project ${project}. Use supabase login with the TFM account.`);
console.log('Verified project access:', project);
const query = (sql, readOnly = false) => management(`projects/${project}/database/query`, { query: sql, read_only: readOnly });
if (action === '--migrate') {
  const sql = fs.readFileSync('supabase/migrations/20260909150000_daily_notifications.sql', 'utf8');
  await query(`begin;\n${sql}\ncommit;`);
  console.log('Notification schema applied. No subscription has been enabled.');
}
if (action === '--migrate' || action === '--upgrade-five') {
  await query(fs.readFileSync('supabase/migrations/20260910120000_five_daily_recommendations.sql', 'utf8'));
  console.log('Five-recommendation migration applied.');
}
if (action === '--activate-cron') {
  const origin = new URL(config.NEXT_PUBLIC_SITE_URL ?? '');
  if (origin.protocol !== 'https:' || origin.pathname !== '/' || origin.search || origin.hash || origin.username || origin.password) throw Error('NEXT_PUBLIC_SITE_URL must be the canonical HTTPS application origin.');
  const secret = config.CRON_SECRET;
  if (!secret || secret.length < 24) throw Error('Set the same CRON_SECRET (at least24 characters) in the app and private local environment.');
  // Refuse to install a dispatcher against an old/missing app route.
  const readiness = await fetch(`${origin.origin}/api/cron/recommendations?check=1`, { headers: { Authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(65_000) });
  const state = await readiness.json().catch(() => null);
  if (!readiness.ok || state?.ok !== true || state.mode !== 'check' || state.projectRef !== project || state.workerVersion !== '2026-09-10-v2') throw Error(`Deploy and verify the notification route first (HTTP${readiness.status}). Cron was not changed.`);
  const literal = (value) => "'" + value.replaceAll("'", "''") + "'";
  for (const [name, value] of [['habitia_app_url', origin.origin], ['habitia_cron_secret', secret]]) {
    await query(`do $setup$ declare sid uuid; begin select id into sid from vault.secrets where name=${literal(name)}; if sid is null then perform vault.create_secret(${literal(value)},${literal(name)}); else perform vault.update_secret(sid,${literal(value)}); end if; end $setup$;`);
  }
  await query(fs.readFileSync('supabase/setup/notifications-cron.sql', 'utf8'));
  const jobs = await query("select jobname, schedule, active from cron.job where jobname='habitia-daily-recommendations';", true);
  console.log('Cron configured:', JSON.stringify(jobs));
}
const verification = await query("select to_regclass('public.notification_subscriptions') is not null as subscriptions, to_regclass('public.recommendation_digests') is not null as digests, has_function_privilege('anon','public.claim_notification_subscription(uuid)','execute') as public_worker_access;", true).catch(() => null);
console.log('Schema verification:', JSON.stringify(verification));
const capacity = await query("select pg_get_constraintdef(oid) as digest_constraint from pg_constraint where conrelid = 'public.recommendation_digests'::regclass and conname = 'recommendation_digests_items_check';", true);
console.log('Digest capacity:', JSON.stringify(capacity));
const worker = await query("select position('jsonb_array_length(p_items) > 5' in pg_get_functiondef('public.finish_notification_subscription(text,uuid,jsonb,text)'::regprocedure)) > 0 as accepts_five, has_function_privilege('service_role','public.finish_notification_subscription(text,uuid,jsonb,text)','execute') as service_access, has_function_privilege('anon','public.finish_notification_subscription(text,uuid,jsonb,text)','execute') as anon_access, has_function_privilege('authenticated','public.finish_notification_subscription(text,uuid,jsonb,text)','execute') as authenticated_access;", true);
console.log('Worker verification:', JSON.stringify(worker));
if (!verification?.[0]?.subscriptions || !verification[0].digests || verification[0].public_worker_access !== false) {
  throw Error('Notification schema or worker permissions are not ready.');
}
if (!capacity?.[0]?.digest_constraint?.includes('<= 5') || worker?.[0]?.accepts_five !== true
    || worker[0].service_access !== true || worker[0].anon_access !== false || worker[0].authenticated_access !== false) {
  throw Error('Five-recommendation capacity or delivery permissions are not ready.');
}
const cron = await query(`select j.jobname, j.schedule, j.active,
  d.status as last_status, d.start_time as last_started_at, d.end_time as last_finished_at
  from cron.job j left join lateral (
    select status, start_time, end_time from cron.job_run_details
    where jobid=j.jobid order by start_time desc limit 1
  ) d on true where j.jobname='habitia-daily-recommendations';`, true).catch(() => null);
console.log('Cron verification:', JSON.stringify(cron));
if (!cron?.some((job) => job.active)) console.warn('No active notification cron was verified. Use --activate-cron after checking the deployed worker.');

}
main().catch((error) => { console.error(error instanceof Error ? error.message : "Notification setup failed."); process.exitCode = 1; });
