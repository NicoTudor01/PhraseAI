-- FIXER: [CHANGED] Repair deployed schemas atomically and allow safe repeated execution.
begin;

drop trigger if exists email_history_set_updated_at on public.email_history;
drop trigger if exists style_tags_set_updated_at on public.style_tags;

-- FIXER: [CHANGED] Email-history finalization logic is isolated to its own row type.
create or replace function public.set_email_history_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  if new.final_version is not null
     and new.finalized_at is null then
    new.finalized_at = now();
  end if;
  return new;
end;
$$;

-- FIXER: [CHANGED] Style tags update only their timestamp and never reference email-history fields.
create or replace function public.set_style_tags_updated_at()
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

create trigger email_history_set_updated_at
before insert or update on public.email_history
for each row execute function public.set_email_history_updated_at();

create trigger style_tags_set_updated_at
before insert or update on public.style_tags
for each row execute function public.set_style_tags_updated_at();

-- FIXER: [CHANGED] The shared trigger function is now dependency-free and safe to remove.
drop function if exists public.set_data_architect_updated_at();

commit;
