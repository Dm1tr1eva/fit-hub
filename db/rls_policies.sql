-- Secure food_logs and profiles with Row Level Security so each user can only
-- touch their own rows. RLS was previously disabled on these tables, so this
-- re-enables it and installs clean per-user policies. Idempotent.
-- (chat_messages is already secured by db/chat_messages.sql.)

-- Drop ALL existing policies on these tables first, so any leftover permissive
-- policy (e.g. "allow all") can't keep the table open once RLS is back on.
do $$
declare p record;
begin
  for p in
    select policyname, tablename from pg_policies
    where schemaname = 'public' and tablename in ('food_logs', 'profiles')
  loop
    execute format('drop policy if exists %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

-- ---------- food_logs (row owner = user_id) ----------
alter table public.food_logs enable row level security;
grant select, insert, update, delete on public.food_logs to authenticated;

create policy "food_logs_select_own" on public.food_logs
  for select using (auth.uid() = user_id);
create policy "food_logs_insert_own" on public.food_logs
  for insert with check (auth.uid() = user_id);
create policy "food_logs_update_own" on public.food_logs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "food_logs_delete_own" on public.food_logs
  for delete using (auth.uid() = user_id);

-- ---------- profiles (row owner = id) ----------
alter table public.profiles enable row level security;
grant select, insert, update on public.profiles to authenticated;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
