-- Chat history for the AI chat page.
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query).

create table if not exists public.chat_messages (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       text not null check (role in ('user', 'assistant')),
  content    text not null default '',
  items      jsonb,                       -- parsed food items for assistant messages
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_user_created_idx
  on public.chat_messages (user_id, created_at);

-- Tables created via raw SQL (not the Table Editor) don't get role privileges
-- automatically — without this the authenticated role gets "permission denied".
-- RLS below still restricts access to each user's own rows.
grant select, insert, update, delete on public.chat_messages to authenticated;

alter table public.chat_messages enable row level security;

create policy "chat_messages_select_own"
  on public.chat_messages for select
  using (auth.uid() = user_id);

create policy "chat_messages_insert_own"
  on public.chat_messages for insert
  with check (auth.uid() = user_id);

create policy "chat_messages_delete_own"
  on public.chat_messages for delete
  using (auth.uid() = user_id);
