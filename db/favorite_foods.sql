-- Favorite ("quick add") food cards. Run in the Supabase SQL editor.
-- Created with RLS + grants + per-user policies from the start.

create table if not exists public.favorite_foods (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  food_name  text not null,
  grams      numeric,
  calories   numeric not null default 0,
  protein_g  numeric not null default 0,
  fat_g      numeric not null default 0,
  carb_g     numeric not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists favorite_foods_user_idx
  on public.favorite_foods (user_id, created_at);

grant select, insert, update, delete on public.favorite_foods to authenticated;

alter table public.favorite_foods enable row level security;

drop policy if exists "favorite_foods_select_own" on public.favorite_foods;
create policy "favorite_foods_select_own" on public.favorite_foods
  for select using (auth.uid() = user_id);

drop policy if exists "favorite_foods_insert_own" on public.favorite_foods;
create policy "favorite_foods_insert_own" on public.favorite_foods
  for insert with check (auth.uid() = user_id);

drop policy if exists "favorite_foods_delete_own" on public.favorite_foods;
create policy "favorite_foods_delete_own" on public.favorite_foods
  for delete using (auth.uid() = user_id);
