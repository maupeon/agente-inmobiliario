-- Demo local: ninguna tabla de datos privados es accesible con la clave pública.
-- No elimina datos existentes. Aplicar antes de publicar esta versión.
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.favorites enable row level security;
alter table public.events enable row level security;
alter table public.market_data enable row level security;
revoke all on public.conversations, public.messages, public.favorites, public.events, public.market_data from anon, authenticated;

create table if not exists public.idealista_search_cache (
  key text primary key,
  properties jsonb not null,
  expires_at timestamptz not null
);
alter table public.idealista_search_cache enable row level security;
revoke all on public.idealista_search_cache from anon, authenticated;
grant select, insert, update, delete on public.idealista_search_cache to service_role;

-- Reserva conservadora ANTES de llamar al proveedor: también cuenta intentos
-- fallidos. El bloqueo serializa la reserva entre procesos/instancias.
create or replace function public.reserve_idealista_request(p_limit integer, p_kind text)
returns table(allowed boolean, used bigint)
language plpgsql security definer set search_path = pg_catalog, public as $$
declare n bigint;
begin
  if p_limit is null or p_kind is null or p_limit < 1 or p_limit > 100 or p_kind <> 'search' then
    raise exception 'Invalid quota configuration';
  end if;
  perform pg_advisory_xact_lock(hashtext('habitia:idealista:monthly'));
  select count(*) into n from public.events
    where event_name = 'idealista_request'
      and created_at >= (date_trunc('month', now() at time zone 'UTC') at time zone 'UTC');
  if n >= p_limit then return query select false, n; return; end if;
  insert into public.events(event_name,event_data)
    values('idealista_request',jsonb_build_object('kind',p_kind,'reservation',true));
  return query select true, n + 1;
end;
$$;
revoke all on function public.reserve_idealista_request(integer,text) from public, anon, authenticated;
grant execute on function public.reserve_idealista_request(integer,text) to service_role;
