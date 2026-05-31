-- User profile
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  sex text check (sex in ('male','female')),
  age int check (age between 5 and 120),
  height_cm numeric check (height_cm between 50 and 260),
  weight_kg numeric check (weight_kg between 20 and 400),
  activity_level text check (activity_level in
    ('sedentary','light','moderate','active','very_active')),
  goal text check (goal in ('lose','maintain','gain')),
  daily_calorie_goal int,
  daily_protein_g int,
  daily_fat_g int,
  daily_carb_g int,
  timezone text default 'Europe/Berlin',
  updated_at timestamptz default now()
);

-- Food log (one row = one recognized food item)
create table food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  raw_message text,
  food_name text not null,
  grams numeric,
  calories numeric not null,
  protein_g numeric default 0,
  carb_g numeric default 0,
  fat_g numeric default 0,
  assumption text,
  created_at timestamptz default now()
);

create index on food_logs (user_id, log_date);

-- Row Level Security
alter table profiles  enable row level security;
alter table food_logs enable row level security;

create policy "own profile"  on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "own logs"     on food_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
