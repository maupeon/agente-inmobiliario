-- Run after deploying /api/cron/recommendations and applying the migration.
-- Set these two Vault secrets through the Supabase dashboard first:
-- habitia_app_url = canonical HTTPS app origin (no trailing slash)
-- habitia_cron_secret = same CRON_SECRET configured in the app (>=24 characters)
-- Never paste secrets into source-controlled SQL.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

create or replace function public.dispatch_habitia_notifications()
returns bigint language plpgsql security definer set search_path = pg_catalog, public as $$
declare app_url text; bearer text; request_id bigint;
begin
  if not exists(select 1 from public.notification_subscriptions s
    where s.enabled and s.expires_at > now() and s.next_run_at <= now()
      and (s.lease_until is null or s.lease_until < now())
      and (s.attempt_date is distinct from (now() at time zone s.time_zone)::date or s.attempts < 3)
      and (now() at time zone s.time_zone)::time >= s.local_time
      and s.last_delivered_date is distinct from (now() at time zone s.time_zone)::date) then return null; end if;
  select decrypted_secret into app_url from vault.decrypted_secrets where name = 'habitia_app_url';
  select decrypted_secret into bearer from vault.decrypted_secrets where name = 'habitia_cron_secret';
  if app_url is null or app_url !~ '^https://[^/]+/?$' or bearer is null or length(bearer) < 24 then
    raise exception 'Configure HabitIA app origin and cron secret in Vault';
  end if;
  select net.http_get(url := rtrim(app_url, '/') || '/api/cron/recommendations',
    headers := jsonb_build_object('Authorization', 'Bearer ' || bearer), timeout_milliseconds := 60000) into request_id;
  return request_id;
end;
$$;
revoke all on function public.dispatch_habitia_notifications() from public, anon, authenticated;
grant execute on function public.dispatch_habitia_notifications() to service_role;
-- Reapplying updates this named job, without creating a duplicate.
select cron.schedule('habitia-daily-recommendations', '* * * * *', 'select public.dispatch_habitia_notifications();');
