-- GUARD: [CHANGED] Apply feedback, profile mirrors, tags, and snapshots in one database transaction.
begin;

-- GUARD: [CHANGED] Keep the reversible delta ledger outside owner-writable public JSON.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated, service_role;

create table if not exists private.style_feedback_adjustments (
  history_id bigint primary key
    references public.email_history(id) on delete cascade,
  user_id uuid not null
    references auth.users(id) on delete cascade,
  rating text not null check (rating in ('good', 'off')),
  effects jsonb not null default '{}'::jsonb
    check (jsonb_typeof(effects) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists style_feedback_adjustments_user_idx
  on private.style_feedback_adjustments (user_id);

revoke all on table private.style_feedback_adjustments
  from public, anon, authenticated, service_role;

-- GUARD: [CHANGED] SECURITY DEFINER is narrowly scoped and performs its own caller and ownership checks.
create or replace function public.apply_style_feedback_atomic(
  p_history_id bigint,
  p_rating text,
  p_user_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth, private
as $$
declare
  v_role text := coalesce(auth.role(), '');
  v_auth_user uuid := auth.uid();
  v_target_user uuid;
  v_history public.email_history%rowtype;
  v_profile_row public.style_profiles%rowtype;
  v_adjustment private.style_feedback_adjustments%rowtype;
  v_profile jsonb;
  v_feedback jsonb;
  v_old_effects jsonb := '{}'::jsonb;
  v_new_effects jsonb := '{}'::jsonb;
  v_trait_name text;
  v_trait jsonb;
  v_old_trait_effect jsonb;
  v_neutral_confidence numeric;
  v_neutral_weight numeric;
  v_new_confidence numeric;
  v_new_weight numeric;
  v_confidence_delta numeric;
  v_weight_delta numeric;
  v_factor numeric;
  v_tags text[] := '{}'::text[];
  v_tag text;
  v_completeness numeric := 0;
  v_completeness_total numeric := 0;
  v_completeness_count integer := 0;
  v_required_trait text;
  v_now timestamptz := clock_timestamp();
  v_history_rows jsonb := '[]'::jsonb;
  v_snapshot_rows jsonb := '[]'::jsonb;
begin
  if p_history_id is null then
    raise exception using
      errcode = '22004',
      message = 'history id is required';
  end if;

  if p_rating is null or p_rating not in ('good', 'off') then
    raise exception using
      errcode = '22023',
      message = 'rating must be good or off';
  end if;

  if v_role = 'service_role' then
    if p_user_id is null then
      raise exception using
        errcode = '22004',
        message = 'service-role calls require an explicit user id';
    end if;
    v_target_user := p_user_id;
  elsif v_role = 'authenticated' and v_auth_user is not null then
    if p_user_id is not null and p_user_id <> v_auth_user then
      raise exception using
        errcode = '42501',
        message = 'feedback history is not owned by the caller';
    end if;
    v_target_user := v_auth_user;
  else
    raise exception using
      errcode = '42501',
      message = 'authentication is required';
  end if;

  -- GUARD: [CHANGED] Lock the history first so concurrent clicks for one rating serialize.
  select *
  into v_history
  from public.email_history
  where id = p_history_id
  for update;

  if not found or v_history.user_id <> v_target_user then
    raise exception using
      errcode = '42501',
      message = 'feedback_history_not_found';
  end if;

  -- GUARD: [CHANGED] A profile must already exist; feedback cannot create an ungrounded profile.
  select *
  into v_profile_row
  from public.style_profiles
  where user_id::text = v_target_user::text
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'owned style profile is missing';
  end if;

  select *
  into v_adjustment
  from private.style_feedback_adjustments
  where history_id = p_history_id
  for update;

  if found then
    if v_adjustment.user_id <> v_target_user then
      raise exception using
        errcode = '42501',
        message = 'feedback adjustment ownership mismatch';
    end if;

    -- GUARD: [CHANGED] Repeating the same rating is a no-op, including tags and snapshots.
    if v_adjustment.rating = p_rating then
      select coalesce(to_jsonb(tags), '[]'::jsonb)
      into v_new_effects
      from public.style_tags
      where user_id = v_target_user;

      select coalesce(
        jsonb_agg(to_jsonb(history_row) order by history_row.submitted_at desc),
        '[]'::jsonb
      )
      into v_history_rows
      from (
        select
          id,
          original_text,
          generated_rewrite,
          final_version,
          feedback,
          influenced_traits,
          submitted_at,
          finalized_at,
          created_at
        from public.email_history
        where user_id = v_target_user
      ) history_row;

      select coalesce(
        jsonb_agg(to_jsonb(snapshot_row) order by snapshot_row.captured_at),
        '[]'::jsonb
      )
      into v_snapshot_rows
      from (
        select id, style, completeness, captured_at, created_at
        from public.persona_snapshots
        where user_id = v_target_user
      ) snapshot_row;

      return jsonb_build_object(
        'changed', false,
        'history_id', p_history_id,
        'rating', p_rating,
        'profile', v_profile_row.profile,
        'tags', coalesce(v_new_effects, '[]'::jsonb),
        'completeness', coalesce(
          (
            select completeness
            from public.persona_snapshots
            where user_id = v_target_user
            order by captured_at desc
            limit 1
          ),
          0
        ),
        'last_updated', v_profile_row.last_updated,
        'history', v_history_rows,
        'snapshots', v_snapshot_rows
      );
    end if;
    v_old_effects := v_adjustment.effects;
  end if;

  v_profile := coalesce(v_profile_row.profile, '{}'::jsonb);
  if jsonb_typeof(v_profile -> 'traits') is distinct from 'object' then
    raise exception using
      errcode = '22023',
      message = 'style profile traits must be a JSON object';
  end if;

  v_factor := case p_rating when 'good' then 1.08 else 0.72 end;

  for v_trait_name in
    select distinct influenced_trait
    from unnest(v_history.influenced_traits) as item(influenced_trait)
    where influenced_trait is not null and btrim(influenced_trait) <> ''
    order by influenced_trait
  loop
    v_trait := v_profile #> array['traits', v_trait_name];
    if jsonb_typeof(v_trait) is distinct from 'object'
       or jsonb_typeof(v_trait -> 'confidence') is distinct from 'number'
       or jsonb_typeof(v_trait -> 'weight') is distinct from 'number' then
      raise exception using
        errcode = '22023',
        message = format('influenced trait %L is missing numeric confidence/weight', v_trait_name);
    end if;

    v_old_trait_effect := coalesce(v_old_effects -> v_trait_name, '{}'::jsonb);
    if v_old_trait_effect <> '{}'::jsonb
       and (
         jsonb_typeof(v_old_trait_effect -> 'confidence') is distinct from 'number'
         or jsonb_typeof(v_old_trait_effect -> 'weight') is distinct from 'number'
       ) then
      raise exception using
        errcode = '22023',
        message = 'stored feedback adjustment is invalid';
    end if;

    -- GUARD: [CHANGED] Remove the prior trusted delta before applying the replacement rating.
    v_neutral_confidence := greatest(
      0,
      least(
        1,
        (v_trait ->> 'confidence')::numeric
          - coalesce((v_old_trait_effect ->> 'confidence')::numeric, 0)
      )
    );
    v_neutral_weight := greatest(
      0,
      least(
        1,
        (v_trait ->> 'weight')::numeric
          - coalesce((v_old_trait_effect ->> 'weight')::numeric, 0)
      )
    );

    v_new_confidence := greatest(0, least(1, v_neutral_confidence * v_factor));
    v_new_weight := greatest(0, least(1, v_neutral_weight * v_factor));
    v_confidence_delta := v_new_confidence - v_neutral_confidence;
    v_weight_delta := v_new_weight - v_neutral_weight;

    v_profile := jsonb_set(
      v_profile,
      array['traits', v_trait_name, 'confidence'],
      to_jsonb(round(v_new_confidence, 6)),
      false
    );
    v_profile := jsonb_set(
      v_profile,
      array['traits', v_trait_name, 'weight'],
      to_jsonb(round(v_new_weight, 6)),
      false
    );
    v_new_effects := jsonb_set(
      v_new_effects,
      array[v_trait_name],
      jsonb_build_object(
        'confidence', round(v_confidence_delta, 6),
        'weight', round(v_weight_delta, 6)
      ),
      true
    );
  end loop;

  v_feedback := coalesce(v_history.feedback, '{}'::jsonb)
    || jsonb_build_object(
      'style_rating', p_rating,
      'style_rating_updated_at', v_now
    );

  update public.email_history
  set feedback = v_feedback
  where id = p_history_id and user_id = v_target_user;

  -- GUARD: [CHANGED] Write both compatibility columns and freshness timestamps together.
  update public.style_profiles
  set
    profile = v_profile,
    current_style = v_profile,
    updated_at = v_now,
    last_updated = v_now
  where user_id::text = v_target_user::text;

  if jsonb_typeof(v_profile -> 'style_tags') = 'array' then
    select coalesce(array_agg(tag order by ordinal), '{}'::text[])
    into v_tags
    from (
      select value as tag, min(ordinality) as ordinal
      from jsonb_array_elements_text(v_profile -> 'style_tags')
        with ordinality as item(value, ordinality)
      where btrim(value) <> ''
      group by value
      order by min(ordinality)
      limit 12
    ) deduplicated_tags;
  else
    foreach v_tag in array array[
      nullif(v_profile #>> '{persona,formality}', ''),
      nullif(v_profile #>> '{persona,directness}', ''),
      nullif(v_profile #>> '{persona,energy}', '')
    ]
    loop
      if v_tag is not null and v_tag <> 'unknown' and not (v_tag = any(v_tags)) then
        v_tags := array_append(v_tags, v_tag);
      end if;
    end loop;
    if v_profile #>> '{preferences,prefers_greeting}' = 'used' then
      v_tags := array_append(v_tags, 'uses-greetings');
    end if;
    if v_profile #>> '{preferences,prefers_signoff}' = 'used' then
      v_tags := array_append(v_tags, 'uses-signoffs');
    end if;
    v_tag := nullif(v_profile #>> '{language_observations,primary}', '');
    if v_tag is not null and v_tag <> 'unknown' then
      v_tags := array_append(v_tags, 'language-' || v_tag);
    end if;
  end if;

  insert into public.style_tags (user_id, tags, created_at, updated_at)
  values (v_target_user, v_tags, v_now, v_now)
  on conflict (user_id) do update
  set tags = excluded.tags, updated_at = excluded.updated_at;

  foreach v_required_trait in array array[
    'tone_formal_casual',
    'average_sentence_length',
    'vocabulary_richness',
    'punctuation_patterns',
    'preferred_openers',
    'preferred_closers',
    'top_recurring_phrases',
    'language'
  ]
  loop
    if jsonb_typeof(v_profile #> array['traits', v_required_trait, 'confidence']) = 'number' then
      v_completeness_total := v_completeness_total
        + greatest(
            0,
            least(
              1,
              (v_profile #>> array['traits', v_required_trait, 'confidence'])::numeric
            )
          );
    end if;
    v_completeness_count := v_completeness_count + 1;
  end loop;
  v_completeness := round(v_completeness_total / v_completeness_count, 4);

  insert into public.persona_snapshots (
    user_id,
    style,
    completeness,
    captured_at,
    created_at
  )
  values (
    v_target_user,
    v_profile,
    v_completeness,
    v_now,
    v_now
  );

  insert into private.style_feedback_adjustments (
    history_id,
    user_id,
    rating,
    effects,
    created_at,
    updated_at
  )
  values (
    p_history_id,
    v_target_user,
    p_rating,
    v_new_effects,
    v_now,
    v_now
  )
  on conflict (history_id) do update
  set
    user_id = excluded.user_id,
    rating = excluded.rating,
    effects = excluded.effects,
    updated_at = excluded.updated_at;

  select coalesce(
    jsonb_agg(to_jsonb(history_row) order by history_row.submitted_at desc),
    '[]'::jsonb
  )
  into v_history_rows
  from (
    select
      id,
      original_text,
      generated_rewrite,
      final_version,
      feedback,
      influenced_traits,
      submitted_at,
      finalized_at,
      created_at
    from public.email_history
    where user_id = v_target_user
  ) history_row;

  select coalesce(
    jsonb_agg(to_jsonb(snapshot_row) order by snapshot_row.captured_at),
    '[]'::jsonb
  )
  into v_snapshot_rows
  from (
    select id, style, completeness, captured_at, created_at
    from public.persona_snapshots
    where user_id = v_target_user
  ) snapshot_row;

  return jsonb_build_object(
    'changed', true,
    'history_id', p_history_id,
    'rating', p_rating,
    'profile', v_profile,
    'tags', to_jsonb(v_tags),
    'completeness', v_completeness,
    'last_updated', v_now,
    'history', v_history_rows,
    'snapshots', v_snapshot_rows
  );
end;
$$;

-- GUARD: [CHANGED] Only authenticated callers and the backend service role may invoke the RPC.
revoke all on function public.apply_style_feedback_atomic(bigint, text, uuid)
  from public, anon;
grant execute on function public.apply_style_feedback_atomic(bigint, text, uuid)
  to authenticated, service_role;

-- GUARD: [CHANGED] Existing owner-only RLS remains enabled on every public artifact table.
alter table public.style_profiles enable row level security;
alter table public.email_history enable row level security;
alter table public.style_tags enable row level security;
alter table public.persona_snapshots enable row level security;

commit;
