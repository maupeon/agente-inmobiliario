-- Private browser-scoped daily recommendations. Service role only.
-- This migration neither imports shared demo history nor enables any subscriber.
create table if not exists public.notification_subscriptions (
  owner_hash text primary key check (owner_hash ~ '^[a-f0-9]{64}$'),
  enabled boolean not null default false,
  local_time time not null default '07:00',
  time_zone text not null default 'Europe/Madrid',
  profile jsonb,
  next_run_at timestamptz not null,
  expires_at timestamptz not null default now() + interval '90 days',
  last_delivered_date date,
  attempt_date date,
  attempts integer not null default 0,
  lease_id uuid,
  lease_until timestamptz,
  lease_date date,
  last_error text,
  updated_at timestamptz not null default now()
);
create table if not exists public.recommendation_digests (
  id uuid primary key default gen_random_uuid(),
  owner_hash text not null references public.notification_subscriptions(owner_hash) on delete cascade,
  local_date date not null,
  items jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) <= 3),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  unique(owner_hash, local_date)
);
create index if not exists notification_due_idx on public.notification_subscriptions(next_run_at) where enabled;
create index if not exists notification_inbox_idx on public.recommendation_digests(owner_hash, created_at desc);
alter table public.notification_subscriptions enable row level security;
alter table public.recommendation_digests enable row level security;
revoke all on public.notification_subscriptions, public.recommendation_digests from public, anon, authenticated;
grant select, insert, update, delete on public.notification_subscriptions, public.recommendation_digests to service_role;

create or replace function public.next_notification_at(p_time time, p_zone text, p_after timestamptz default now())
returns timestamptz language plpgsql stable set search_path = pg_catalog, public as $$
declare candidate timestamptz; day date;
begin
  if not exists(select 1 from pg_timezone_names where name = p_zone) then raise exception 'Invalid time zone'; end if;
  day := (p_after at time zone p_zone)::date;
  candidate := (day + p_time) at time zone p_zone;
  if candidate <= p_after then candidate := ((day + 1) + p_time) at time zone p_zone; end if;
  return candidate;
end;
$$;

create or replace function public.save_notification_subscription(p_owner text, p_enabled boolean, p_time time, p_zone text, p_profile jsonb)
returns void language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if p_owner is null or p_owner !~ '^[a-f0-9]{64}$' or p_enabled is null or p_time is null or p_zone is null
    or (p_enabled and (jsonb_typeof(p_profile) is distinct from 'object' or nullif(trim(p_profile->>'zona'), '') is null)) then
    raise exception 'Invalid subscription';
  end if;
  insert into public.notification_subscriptions(owner_hash, enabled, local_time, time_zone, profile, next_run_at)
  values(p_owner, p_enabled, p_time, p_zone, p_profile, public.next_notification_at(p_time, p_zone))
  on conflict(owner_hash) do update set
    enabled = excluded.enabled, local_time = excluded.local_time, time_zone = excluded.time_zone,
    profile = excluded.profile, next_run_at = case
      when notification_subscriptions.enabled = excluded.enabled and notification_subscriptions.local_time = excluded.local_time
        and notification_subscriptions.time_zone = excluded.time_zone then notification_subscriptions.next_run_at
      when notification_subscriptions.last_delivered_date = (now() at time zone excluded.time_zone)::date then
        public.next_notification_at(excluded.local_time, excluded.time_zone,
          greatest(now(), ((now() at time zone excluded.time_zone)::date + excluded.local_time) at time zone excluded.time_zone))
      else excluded.next_run_at end,
    expires_at = now() + interval '90 days', lease_id = null, lease_until = null,
    last_error = null, updated_at = now();
end;
$$;

create or replace function public.claim_notification_subscription(p_lease uuid)
returns table(owner_hash text, profile jsonb) language plpgsql security definer set search_path = pg_catalog, public as $$
declare selected public.notification_subscriptions; today date;
begin
  if p_lease is null then raise exception 'Missing lease'; end if;
  select s.* into selected from public.notification_subscriptions s
    where s.enabled and s.expires_at > now() and s.next_run_at <= now()
      and (s.lease_until is null or s.lease_until < now())
      and (s.attempt_date is distinct from (now() at time zone s.time_zone)::date or s.attempts < 3)
      and (now() at time zone s.time_zone)::time >= s.local_time
      and s.last_delivered_date is distinct from (now() at time zone s.time_zone)::date
    order by s.next_run_at, s.owner_hash limit 1 for update skip locked;
  if not found then return; end if;
  today := (now() at time zone selected.time_zone)::date;
  update public.notification_subscriptions s set lease_id = p_lease, lease_until = now() + interval '5 minutes',
    lease_date = today, attempt_date = today,
    attempts = case when s.attempt_date = today then s.attempts + 1 else 1 end,
    next_run_at = case when s.attempt_date = today and s.attempts >= 2 then public.next_notification_at(s.local_time, s.time_zone) else s.next_run_at end
    where s.owner_hash = selected.owner_hash;
  return query select selected.owner_hash, selected.profile;
end;
$$;

create or replace function public.finish_notification_subscription(p_owner text, p_lease uuid, p_items jsonb, p_error text default null)
returns boolean language plpgsql security definer set search_path = pg_catalog, public as $$
declare selected public.notification_subscriptions; inserted integer;
begin
  select * into selected from public.notification_subscriptions s where s.owner_hash = p_owner for update;
  -- A pause or profile/schedule edit invalidates in-flight results.
  if not found or not selected.enabled or selected.lease_id is distinct from p_lease or selected.expires_at <= now() then return false; end if;
  if p_error is null then
    if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) > 3 then raise exception 'Invalid digest'; end if;
    insert into public.recommendation_digests(owner_hash, local_date, items)
      values(p_owner, selected.lease_date, p_items) on conflict(owner_hash,local_date) do nothing;
    get diagnostics inserted = row_count;
    update public.notification_subscriptions set last_delivered_date = selected.lease_date,
      next_run_at = public.next_notification_at(local_time, time_zone), attempts = 0,
      lease_id = null, lease_until = null, last_error = null where owner_hash = p_owner;
    return inserted = 1;
  end if;
  update public.notification_subscriptions set
    next_run_at = case when attempts < 3 then now() + interval '15 minutes' else public.next_notification_at(local_time, time_zone) end,
    lease_id = null, lease_until = null, last_error = left(p_error, 400) where owner_hash = p_owner;
  return false;
end;
$$;

revoke all on function public.next_notification_at(time,text,timestamptz) from public, anon, authenticated;
revoke all on function public.save_notification_subscription(text,boolean,time,text,jsonb) from public, anon, authenticated;
revoke all on function public.claim_notification_subscription(uuid) from public, anon, authenticated;
revoke all on function public.finish_notification_subscription(text,uuid,jsonb,text) from public, anon, authenticated;
grant execute on function public.next_notification_at(time,text,timestamptz) to service_role;
grant execute on function public.save_notification_subscription(text,boolean,time,text,jsonb) to service_role;
grant execute on function public.claim_notification_subscription(uuid) to service_role;
grant execute on function public.finish_notification_subscription(text,uuid,jsonb,text) to service_role;
notify pgrst, 'reload schema';
