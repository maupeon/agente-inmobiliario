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
