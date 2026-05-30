-- PesoControl V2 Debt and Foods

-- Users Profile
alter table public.users_profile
  add column if not exists start_weight_kg numeric(5,1),
  add column if not exists start_date date,
  add column if not exists debt_total_kcal integer;

-- Foods
create table if not exists public.foods (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  kcal_per_unit numeric(8,2) not null,
  default_unit text not null check (default_unit in ('g', 'ml', 'pieza', 'porcion')),
  protein_g numeric(6,1) default 0,
  carbs_g numeric(6,1) default 0,
  fat_g numeric(6,1) default 0,
  barcode text,
  source text not null default 'manual' check (source in ('manual', 'ai', 'off')),
  times_used integer default 0,
  last_used_at timestamptz,
  created_at timestamptz default now()
);

-- Food Entries
alter table public.food_entries
  add column if not exists food_id uuid references public.foods(id) on delete set null,
  add column if not exists quantity numeric(8,2),
  add column if not exists unit text;

-- Indexes
create index if not exists idx_foods_user_id on public.foods(user_id);
create index if not exists idx_foods_user_last_used on public.foods(user_id, last_used_at desc);

-- Row Level Security
alter table public.foods enable row level security;

-- RLS Policies
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'foods'
      and policyname = 'Users can view own foods'
  ) then
    create policy "Users can view own foods" on public.foods for select using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'foods'
      and policyname = 'Users can insert own foods'
  ) then
    create policy "Users can insert own foods" on public.foods for insert with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'foods'
      and policyname = 'Users can update own foods'
  ) then
    create policy "Users can update own foods" on public.foods for update using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'foods'
      and policyname = 'Users can delete own foods'
  ) then
    create policy "Users can delete own foods" on public.foods for delete using (auth.uid() = user_id);
  end if;
end $$;
