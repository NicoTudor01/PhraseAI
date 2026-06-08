create table if not exists public.learning_events (
  id bigserial primary key,
  user_id text not null,
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
