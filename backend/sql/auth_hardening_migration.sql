-- Migration for existing deployments that used text user_id values.
-- WARNING: rows with non-UUID user_id values are removed before casting.

alter table if exists public.learning_events disable row level security;
alter table if exists public.style_profiles disable row level security;

delete from public.learning_events where user_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
delete from public.style_profiles where user_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

alter table public.learning_events
  alter column user_id type uuid using user_id::uuid;

alter table public.style_profiles
  alter column user_id type uuid using user_id::uuid;

alter table public.learning_events
  drop constraint if exists learning_events_user_id_fkey,
  add constraint learning_events_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.style_profiles
  drop constraint if exists style_profiles_user_id_fkey,
  add constraint style_profiles_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.learning_events enable row level security;
alter table public.style_profiles enable row level security;

drop policy if exists "learning_events_select_own" on public.learning_events;
create policy "learning_events_select_own"
on public.learning_events
for select
using (auth.uid() = user_id);

drop policy if exists "learning_events_insert_own" on public.learning_events;
create policy "learning_events_insert_own"
on public.learning_events
for insert
with check (auth.uid() = user_id);

drop policy if exists "learning_events_update_own" on public.learning_events;
create policy "learning_events_update_own"
on public.learning_events
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "learning_events_delete_own" on public.learning_events;
create policy "learning_events_delete_own"
on public.learning_events
for delete
using (auth.uid() = user_id);

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
