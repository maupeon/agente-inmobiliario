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
