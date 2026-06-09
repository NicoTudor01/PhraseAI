create table if not exists public.style_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  profile jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.style_profiles enable row level security;

drop policy if exists "style_profiles_select_own" on public.style_profiles;
create policy "style_profiles_select_own"
on public.style_profiles
for select
using (auth.uid() = user_id);

drop policy if exists "style_profiles_insert_own" on public.style_profiles;
create policy "style_profiles_insert_own"
on public.style_profiles
for insert
with check (auth.uid() = user_id);

drop policy if exists "style_profiles_update_own" on public.style_profiles;
create policy "style_profiles_update_own"
on public.style_profiles
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "style_profiles_delete_own" on public.style_profiles;
create policy "style_profiles_delete_own"
on public.style_profiles
for delete
using (auth.uid() = user_id);
