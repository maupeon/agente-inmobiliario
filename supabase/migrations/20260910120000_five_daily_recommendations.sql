-- Apply before deploying the worker that sends five recommendations.
begin;
alter table public.recommendation_digests drop constraint if exists recommendation_digests_items_check;
alter table public.recommendation_digests add constraint recommendation_digests_items_check
  check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) <= 5);
create or replace function public.finish_notification_subscription(p_owner text, p_lease uuid, p_items jsonb, p_error text default null)
returns boolean language plpgsql security definer set search_path = pg_catalog, public as $$
declare selected public.notification_subscriptions; inserted integer;
begin
  select * into selected from public.notification_subscriptions s where s.owner_hash = p_owner for update;
  -- A pause or profile/schedule edit invalidates in-flight results.
  if not found or not selected.enabled or selected.lease_id is distinct from p_lease or selected.expires_at <= now() then return false; end if;
  if p_error is null then
    if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) > 5 then raise exception 'Invalid digest'; end if;
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

revoke all on function public.finish_notification_subscription(text,uuid,jsonb,text) from public, anon, authenticated;
grant execute on function public.finish_notification_subscription(text,uuid,jsonb,text) to service_role;
notify pgrst, 'reload schema';
commit;
