create table if not exists public.learning_events (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null,
  source text not null default 'manual',
  draft text not null,
  ai_output text not null,
  final_version text not null,
  signals jsonb not null default '{}'::jsonb,
  persona_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists learning_events_user_created_idx
  on public.learning_events (user_id, created_at desc);

alter table public.learning_events enable row level security;
-- AGENT4: [HARDENED] Every operation is scoped to the authenticated user's UUID.

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
