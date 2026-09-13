-- Esquema base de HabitIA. Instalación y migraciones: docs/configuracion.md.
-- Incluye cuota y demo compartida; las notificaciones requieren sus migraciones.

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

-- Espacio global y compartido del TFM. No publica datos privados anteriores.
create table if not exists public.demo_conversations (
  id text primary key,
  title text not null,
  preview text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.demo_messages (
  conversation_id text not null references public.demo_conversations(id) on delete cascade,
  id text not null,
  position bigint generated always as identity,
  payload jsonb not null,
  primary key (conversation_id, id)
);
create index if not exists demo_messages_order_idx on public.demo_messages(conversation_id, position);
create index if not exists demo_conversations_updated_idx on public.demo_conversations(updated_at desc);
create table if not exists public.demo_favorites (
  property_id text primary key,
  property_data jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.demo_conversations enable row level security;
alter table public.demo_messages enable row level security;
alter table public.demo_favorites enable row level security;
revoke all on public.demo_conversations, public.demo_messages, public.demo_favorites from public, anon, authenticated;
grant select, insert, update, delete on public.demo_conversations, public.demo_messages, public.demo_favorites to service_role;
grant usage, select on sequence public.demo_messages_position_seq to service_role;

-- Operación atómica e idempotente: no duplica ni borra mensajes anteriores.
create or replace function public.save_demo_conversation(p_id text, p_messages jsonb)
returns void language plpgsql security definer set search_path = pg_catalog, public as $$
declare m jsonb;
begin
  if p_id is null or p_id !~ '^[a-zA-Z0-9-]{1,80}$'
    or p_messages is null or jsonb_typeof(p_messages) <> 'array' then
    raise exception 'Invalid demo conversation';
  end if;
  if jsonb_array_length(p_messages) < 1 or jsonb_array_length(p_messages) > 40 then
    raise exception 'Invalid message count';
  end if;
  insert into public.demo_conversations(id, title, preview)
    values(p_id, left(coalesce(p_messages->0->>'content', 'Conversación'), 70), left(coalesce(p_messages->-1->>'content', ''), 120))
    on conflict(id) do update set preview = excluded.preview, updated_at = now();
  for m in select value from jsonb_array_elements(p_messages) loop
    if m->>'id' is null or m->>'id' !~ '^[a-zA-Z0-9-]{1,80}$'
      or m->>'role' is null or m->>'role' not in ('user','assistant')
      or jsonb_typeof(m->'content') is distinct from 'string' then
      raise exception 'Invalid demo message';
    end if;
    insert into public.demo_messages(conversation_id, id, payload)
      values(p_id, m->>'id', m)
      on conflict(conversation_id, id) do update set payload = excluded.payload;
  end loop;
end;
$$;
revoke all on function public.save_demo_conversation(text,jsonb) from public, anon, authenticated;
grant execute on function public.save_demo_conversation(text,jsonb) to service_role;
notify pgrst, 'reload schema';
