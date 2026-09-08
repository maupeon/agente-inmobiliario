-- Schema completo para Nido. Ejecutar en el SQL editor de Supabase.

-- Conversaciones ----------------------------------------------------------
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  user_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  title text
);

-- Mensajes ----------------------------------------------------------------
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'tool')),
  content text not null,
  tool_name text,
  tool_input jsonb,
  tool_result jsonb,
  created_at timestamptz default now()
);

-- Favoritos ---------------------------------------------------------------
create table if not exists favorites (
  id uuid primary key default gen_random_uuid(),
  user_id text,
  property_id text not null,
  property_data jsonb not null,
  created_at timestamptz default now(),
  unique(user_id, property_id)
);

-- Eventos analíticos (sin PII) -------------------------------------------
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  user_id text,
  event_name text not null,
  event_data jsonb,
  created_at timestamptz default now()
);

-- Datos de mercado cacheados (INE + BdE) ---------------------------------
create table if not exists market_data (
  key text primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);

-- Índices ----------------------------------------------------------------
create index if not exists messages_conversation_id_idx on messages(conversation_id);
create index if not exists favorites_user_id_idx on favorites(user_id);
create index if not exists events_event_name_idx on events(event_name);
create index if not exists conversations_updated_at_idx on conversations(updated_at desc);

-- Trigger updated_at -----------------------------------------------------
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists conversations_updated_at on conversations;
create trigger conversations_updated_at
  before update on conversations
  for each row execute function set_updated_at();

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
