create table if not exists public.style_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  profile jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- AGENT3: [CHANGE] Keep profile freshness accurate across every upsert path.
create or replace function public.set_style_profiles_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists style_profiles_set_updated_at on public.style_profiles;
create trigger style_profiles_set_updated_at
before update on public.style_profiles
for each row execute function public.set_style_profiles_updated_at();

alter table public.style_profiles enable row level security;
-- AGENT4: [HARDENED] RLS policies below isolate every direct Supabase operation by auth.uid().

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
