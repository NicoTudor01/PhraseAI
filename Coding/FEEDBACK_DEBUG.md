## Tracer — Root Cause

The confirmed production failure is a shared PostgreSQL trigger function using fields
that do not exist on every table where the function is installed.

### Production evidence

At June 10, 2026 22:43:41, the Supabase API Gateway recorded:

1. `style_profiles` `POST` returning HTTP 200.
2. The immediately following `style_tags` `POST` returning HTTP 400.
3. The PostgREST proxy reporting PostgreSQL error `42703` (undefined column).

This matches `save_profile_artifacts()` write order and rules out the earlier theory
that the first `style_profiles` upsert was failing because of schema drift.

### Exact cause

`backend/sql/20260610_data_architect_schema.sql` installed
`set_data_architect_updated_at()` as the trigger function for both `email_history`
and `style_tags`. Its body referenced `NEW.final_version` and `NEW.finalized_at`.
Those columns exist on `email_history`, but not on the `style_tags` row type.

PostgreSQL therefore raised `42703` when the successful `style_profiles` write was
followed by the `style_tags` upsert. The backend caught that exception and returned
the generic learning-update storage error. The same broken trigger could also affect
feedback persistence when its database transaction writes `style_tags`.

Temporary `TRACER` logging remains in place so the underlying Supabase/PostgreSQL
exception is retained at each generic backend and frontend error boundary.

## Fixer — Changes Made

- Split timestamp handling into table-specific trigger functions:
  `set_email_history_updated_at()` and `set_style_tags_updated_at()`.
- Updated the original data-architect schema so fresh deployments do not install the
  shared trigger.
- Added an idempotent repair migration for deployed databases. It drops the existing
  triggers, recreates them against the table-specific functions, and removes the old
  shared function inside one transaction.
- Added focused structural tests proving the `style_tags` trigger function does not
  reference `final_version` or `finalized_at` and the repair migration replaces the
  shared trigger safely.

## Verifier — Results

- **Good — PASS:** The production transaction probe successfully called
  `apply_style_feedback_atomic` with `good` and asserted the returned rating.
- **Off — PASS:** The same rolled-back production probe successfully called the RPC
  with `off` and asserted the returned rating.
- **User/timestamp persistence and ownership — PASS:** The RPC derives or validates
  the target user, rejects non-owned history, scopes writes to that owner, and stores
  `style_rating` with `style_rating_updated_at`; the production probe exercised these
  writes transactionally. It was rolled back, so this is not evidence of a permanent
  test row or a lasting dashboard display.
- **Normal-use generic error elimination — PASS:** The repair migration was applied
  successfully, and production transaction probes then updated `style_tags` and
  completed both feedback ratings without the prior PostgreSQL `42703` failure.
  This verifies elimination of the identified generic-error path, not every possible
  storage failure.

Backend verification passed `27/27`. Supplied frontend evidence reports `3/3` tests
and a passing Vite build; those frontend commands were not rerun in this verifier
shell because `npm` was unavailable.
