\set ON_ERROR_STOP on
begin;
-- Test helpers abort immediately on failures, so a successful commit is evidence.
create or replace function pg_temp.assert_true(ok boolean, label text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'FAIL: %', label; end if; raise notice 'PASS: %', label; end; $$;
select pg_temp.assert_true(public.next_notification_at('07:00', 'Europe/Madrid', '2026-07-10 04:59Z') = '2026-07-10 05:00Z', 'Madrid summer07:00');
select pg_temp.assert_true(public.next_notification_at('07:00', 'Europe/Madrid', '2026-01-10 05:59Z') = '2026-01-10 06:00Z', 'Madrid winter07:00');
select pg_temp.assert_true(public.next_notification_at('07:00', 'Europe/Madrid', '2026-03-28 06:00Z') = '2026-03-29 05:00Z', 'spring DST next day');
select pg_temp.assert_true(public.next_notification_at('07:00', 'Europe/Madrid', '2026-10-24 05:00Z') = '2026-10-25 06:00Z', 'autumn DST next day');
select pg_temp.assert_true(public.next_notification_at('07:00', 'Atlantic/Canary', '2026-07-10 05:59Z') = '2026-07-10 06:00Z', 'Canary timezone');
select pg_temp.assert_true(public.next_notification_at('02:30', 'Europe/Madrid', '2026-03-28 03:00Z') = '2026-03-29 01:30Z', 'nonexistent time moves forward at DST');
select pg_temp.assert_true(not has_table_privilege('anon', 'public.notification_subscriptions', 'SELECT') and not has_table_privilege('authenticated', 'public.recommendation_digests', 'SELECT'), 'no public profile or inbox access');
select pg_temp.assert_true(not has_function_privilege('anon', 'public.claim_notification_subscription(uuid)', 'EXECUTE'), 'no public worker access');
select public.save_notification_subscription(repeat('a',64), true, '00:00', 'UTC', '{"zona":"Madrid","operacion":"alquiler"}');
update public.notification_subscriptions set next_run_at = now()-interval '1 minute' where owner_hash=repeat('a',64);
select pg_temp.assert_true((select count(*)=1 from public.claim_notification_subscription('11111111-1111-4111-8111-111111111111')), 'claim due subscription');
select pg_temp.assert_true((select count(*)=0 from public.claim_notification_subscription('22222222-2222-4222-8222-222222222222')), 'second worker cannot double-claim');
select pg_temp.assert_true(not public.finish_notification_subscription(repeat('a',64),'22222222-2222-4222-8222-222222222222','[]'), 'wrong lease cannot deliver');
-- Six entries must fail before insertion; the lease remains usable for five.
do $$
begin
  begin
    perform public.finish_notification_subscription(repeat('a',64),'11111111-1111-4111-8111-111111111111','[{},{},{},{},{},{}]');
    raise exception 'FAIL: accepted six recommendations';
  exception when others then
    if sqlerrm <> 'Invalid digest' then raise; end if;
  end;
end;
$$;
select pg_temp.assert_true(public.finish_notification_subscription(repeat('a',64),'11111111-1111-4111-8111-111111111111','[{"score":90},{"score":80},{"score":70},{"score":60},{"score":50}]'), 'deliver5');
select pg_temp.assert_true(not public.finish_notification_subscription(repeat('a',64),'11111111-1111-4111-8111-111111111111','[]'), 'replay does not duplicate');
select pg_temp.assert_true((select count(*)=1 from public.recommendation_digests where owner_hash=repeat('a',64)), 'one digest per day');
-- Changing today's delivery hour after it already ran schedules tomorrow.
select public.save_notification_subscription(repeat('a',64), true, '23:59:59', 'UTC', '{"zona":"Madrid","operacion":"alquiler"}');
select pg_temp.assert_true((select next_run_at::date > current_date from public.notification_subscriptions where owner_hash=repeat('a',64)), 'schedule edit after delivery shows tomorrow');
select public.save_notification_subscription(repeat('a',64), true, '00:00', 'UTC', '{"zona":"Madrid","operacion":"alquiler"}');
-- Schedule edits after delivery cannot create another notification today.
update public.notification_subscriptions set next_run_at=now()-interval '1 minute' where owner_hash=repeat('a',64);
select pg_temp.assert_true((select count(*)=0 from public.claim_notification_subscription('22222222-2222-4222-8222-222222222222')), 'same day edit does not redeliver');
-- Different visitor is independently claimable, and pausing cancels in-flight work.
select public.save_notification_subscription(repeat('b',64), true, '00:00', 'UTC', '{"zona":"Valencia","operacion":"alquiler"}');
update public.notification_subscriptions set next_run_at=now()-interval '1 minute' where owner_hash=repeat('b',64);
select pg_temp.assert_true((select owner_hash=repeat('b',64) from public.claim_notification_subscription('22222222-2222-4222-8222-222222222222')), 'independent visitor claim');
select public.save_notification_subscription(repeat('b',64), false, '00:00', 'UTC', null);
select pg_temp.assert_true(not public.finish_notification_subscription(repeat('b',64),'22222222-2222-4222-8222-222222222222','[]'), 'pause invalidates lease');
select pg_temp.assert_true((select count(*)=0 from public.recommendation_digests where owner_hash=repeat('b',64)), 'paused visitor gets no digest');
-- Retry is delayed and an expired lease can be reclaimed.
select public.save_notification_subscription(repeat('c',64), true, '00:00', 'UTC', '{"zona":"Madrid","operacion":"alquiler"}');
update public.notification_subscriptions set next_run_at=now()-interval '1 minute' where owner_hash=repeat('c',64);
select * from public.claim_notification_subscription('33333333-3333-4333-8333-333333333333');
select public.finish_notification_subscription(repeat('c',64),'33333333-3333-4333-8333-333333333333','[]','Temporary failure');
select pg_temp.assert_true((select attempts=1 and next_run_at=now()+interval '15 minutes' from public.notification_subscriptions where owner_hash=repeat('c',64)), '15 minute retry');
update public.notification_subscriptions set next_run_at=now()-interval '1 minute' where owner_hash=repeat('c',64);
select * from public.claim_notification_subscription('33333333-3333-4333-8333-333333333333');
update public.notification_subscriptions set lease_until=now()-interval '1 minute' where owner_hash=repeat('c',64);
select pg_temp.assert_true((select count(*)=1 from public.claim_notification_subscription('44444444-4444-4444-8444-444444444444')), 'crashed worker lease reclaimed');
select public.finish_notification_subscription(repeat('c',64),'44444444-4444-4444-8444-444444444444','[]','Temporary failure');
select pg_temp.assert_true((select attempts=3 and next_run_at=public.next_notification_at('00:00','UTC') from public.notification_subscriptions where owner_hash=repeat('c',64)), 'third failure deferred to next day');
-- Three worker crashes must not consume quota forever.
select public.save_notification_subscription(repeat('d',64), true, '00:00', 'UTC', '{"zona":"Madrid","operacion":"alquiler"}');
update public.notification_subscriptions set next_run_at=now()-interval '1 minute' where owner_hash=repeat('d',64);
select * from public.claim_notification_subscription('55555555-5555-4555-8555-555555555555');
update public.notification_subscriptions set lease_until=now()-interval '1 minute' where owner_hash=repeat('d',64);
select * from public.claim_notification_subscription('55555555-5555-4555-8555-555555555555');
update public.notification_subscriptions set lease_until=now()-interval '1 minute' where owner_hash=repeat('d',64);
select * from public.claim_notification_subscription('55555555-5555-4555-8555-555555555555');
update public.notification_subscriptions set lease_until=now()-interval '1 minute' where owner_hash=repeat('d',64);
select pg_temp.assert_true((select count(*)=0 from public.claim_notification_subscription('55555555-5555-4555-8555-555555555555')), 'fourth attempt blocked after three crashes');
rollback;
