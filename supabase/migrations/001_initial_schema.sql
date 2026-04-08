-- PesoControl Initial Schema
create extension if not exists "uuid-ossp";

-- Users Profile
create table public.users_profile (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  name text,
  age integer not null,
  sex text not null check (sex in ('male', 'female')),
  height_cm numeric(5,1) not null,
  current_weight_kg numeric(5,1) not null,
  target_weight_kg numeric(5,1) not null,
  target_date date,
  activity_level text not null check (activity_level in (
    'sedentary', 'light', 'moderate', 'active', 'very_active'
  )),
  tdee integer not null,
  daily_calorie_target integer not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Food Entries
create table public.food_entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null default current_date,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  name text not null,
  calories integer not null,
  protein_g numeric(6,1) default 0,
  carbs_g numeric(6,1) default 0,
  fat_g numeric(6,1) default 0,
  fiber_g numeric(6,1) default 0,
  serving_size text,
  photo_url text,
  ai_estimated boolean default false,
  notes text,
  created_at timestamptz default now()
);

-- Weight Entries
create table public.weight_entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null default current_date,
  weight_kg numeric(5,1) not null,
  notes text,
  created_at timestamptz default now(),
  unique(user_id, date)
);

-- Daily Summary
create table public.daily_summary (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  calories_in integer default 0,
  calories_out integer default 0,
  net_balance integer default 0,
  theoretical_weight_kg numeric(5,1),
  created_at timestamptz default now(),
  unique(user_id, date)
);

-- Indexes
create index idx_food_entries_user_date on public.food_entries(user_id, date);
create index idx_weight_entries_user_date on public.weight_entries(user_id, date);
create index idx_daily_summary_user_date on public.daily_summary(user_id, date);

-- Row Level Security
alter table public.users_profile enable row level security;
alter table public.food_entries enable row level security;
alter table public.weight_entries enable row level security;
alter table public.daily_summary enable row level security;

-- RLS Policies
create policy "Users can view own profile" on public.users_profile for select using (auth.uid() = user_id);
create policy "Users can insert own profile" on public.users_profile for insert with check (auth.uid() = user_id);
create policy "Users can update own profile" on public.users_profile for update using (auth.uid() = user_id);

create policy "Users can view own food entries" on public.food_entries for select using (auth.uid() = user_id);
create policy "Users can insert own food entries" on public.food_entries for insert with check (auth.uid() = user_id);
create policy "Users can update own food entries" on public.food_entries for update using (auth.uid() = user_id);
create policy "Users can delete own food entries" on public.food_entries for delete using (auth.uid() = user_id);

create policy "Users can view own weight entries" on public.weight_entries for select using (auth.uid() = user_id);
create policy "Users can insert own weight entries" on public.weight_entries for insert with check (auth.uid() = user_id);
create policy "Users can update own weight entries" on public.weight_entries for update using (auth.uid() = user_id);
create policy "Users can delete own weight entries" on public.weight_entries for delete using (auth.uid() = user_id);

create policy "Users can view own daily summary" on public.daily_summary for select using (auth.uid() = user_id);
create policy "Users can upsert own daily summary" on public.daily_summary for insert with check (auth.uid() = user_id);
create policy "Users can update own daily summary" on public.daily_summary for update using (auth.uid() = user_id);
