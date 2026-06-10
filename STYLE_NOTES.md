## Scout — File Map
`.env.example` — Documents frontend auth/API settings and backend learning, profile-size, fallback, and stress-test controls.
`README.md` — Describes the rewrite-learning workflow, Supabase tables, profile/history endpoints, and deployment setup.
`RECON_NOTES.md` — Detailed audit of current personalization, stored history, auth boundaries, UI behavior, and known gaps.
`AGENT_NOTES.md` — Summarizes prior changes and outstanding work across style learning, UI, auth, privacy, and tests.
`DEBUG_NOTES.md` — Traces rewrite failures and documents the current typed fallback and diagnostic behavior.
`backend/app/main.py` — Implements authenticated rewriting, style-signal extraction, profile aggregation, feedback storage, history retrieval, and all related API routes.
`backend/sql/style_profiles.sql` — Defines the per-user JSON style profile table, timestamp trigger, and owner-scoped RLS policies.
`backend/sql/learning_events.sql` — Defines raw rewrite/finalization history, signal snapshots, indexing, and owner-scoped RLS policies.
`backend/sql/auth_hardening_migration.sql` — Migrates legacy profile/history ownership to auth-user UUIDs and reinstates scoped RLS.
`backend/scripts/simulate_learning.py` — Replays fixture feedback through the production profile updater to inspect persona convergence.
`backend/tests/test_pipeline.py` — Tests profile learning, bounded history, prompt privacy, rewrite validation, and provider fallback categories.
`frontend/index.html` — Supplies the Vite mount point, viewport metadata, title, theme color, and active favicon.
`frontend/src/main.jsx` — Mounts the React application and imports the active global stylesheet.
`frontend/src/App.jsx` — Owns auth, composer, rewrite/finalize feedback, profile/history loading, and all current application views.
`frontend/src/rewriteResponse.js` — Validates the backend rewrite contract before output reaches UI state.
`frontend/src/index.css` — Active responsive styling for auth, navigation, composer, feedback states, themes, profile, and history UI.
`frontend/src/App.css` — Unused legacy Vite scaffold styles retained in the source tree but not imported by the current UI.
`frontend/tests/rewriteResponse.test.js` — Covers accepted provider/fallback responses and rejection of malformed rewrite payloads.
`frontend/public/favicon.svg` — Active PhraseAI browser icon referenced by the UI shell.
`frontend/package.json` — Declares the React, Supabase, Vite, Tailwind, build, and frontend test toolchain.
`frontend/vite.config.js` — Configures React compilation and the local `/api` proxy used by the UI.
`frontend/tailwind.config.js` — Defines source scanning and the small Tailwind theme extension used by UI utility classes.
`frontend/postcss.config.js` — Runs Tailwind and Autoprefixer for the active stylesheet pipeline.
`frontend/vercel.json` — Builds the frontend and proxies production `/api` requests to the backend.
`vercel.json` — Provides equivalent root-level frontend build and production API rewrite configuration.

## Data Architect — Schema
`backend/sql/20260610_data_architect_schema.sql` transactionally adds the production persistence model: mirrored current style JSON and freshness timestamps on the one-row-per-user `style_profiles`, complete `email_history`, periodic `persona_snapshots` with bounded completeness, and queryable `style_tags text[]`. Auth-user cascade foreign keys, timeline/GIN indexes, database-maintained timestamps, RLS, and explicit authenticated owner-only CRUD policies prevent cross-user access.

The migration is idempotent and preserves the deployed backend contract by retaining and synchronizing `style_profiles.profile`/`updated_at` with `current_style`/`last_updated`; it leaves `learning_events` intact. Legacy text ownership is preserved with a notice for the existing reviewed hardening migration rather than being rewritten or deleted implicitly.

## AI Pipeline — Style Logic
- Every completed authenticated rewrite, including local fallback output, creates a user-scoped `email_history` row before the response returns.
- Finalization learns bounded aggregate traits with value, confidence, weight, and evidence count; sparse emails contribute less evidence, and language shifts lower language certainty until reinforced.
- Learned artifacts update synchronized style profile columns, queryable tags, an immutable persona snapshot, influenced history traits, and the legacy `learning_events` record.
- Provider prompts receive valid bounded JSON in the system message containing derived style only; raw prior emails, excerpts, and user identifiers are excluded.
- `GET /style-data/me` returns the authenticated aggregate, while `POST /style-feedback` accepts `good` or `off`, adjusts trait confidence/weight, optionally annotates a history row, and returns refreshed data.

## Frontend — Style Profile UI
- `frontend/src/App.jsx` loads the authenticated `/style-data/me` aggregate for the Style Profile and History routes, normalizes additive contract aliases, and never stores profile/history data in browser persistence.
- The profile includes a confidence-weighted SVG Persona Map, plain-English summary, Style Strength meter, clickable snapshot timeline, and scrollable original-versus-rewrite history.
- Good/Off controls POST `{rating: "good" | "off"}` to `/email-history/{id}/feedback`; successful feedback, finalization, and development learning refresh the aggregate.
- `frontend/src/index.css` provides responsive card, map, timeline, history, loading, error, empty, and reduced-motion-compatible treatments in the existing dark/light theme system.

## Integration — Loop Verification
No broken links found.

Authenticated provider and fallback rewrites persist owner-scoped `email_history`; finalization updates the current profile and tags, writes a persona snapshot, finalizes the matching pending history row, and the frontend reloads the shared aggregate for its map, timeline, summary, strength, and history. Logout clears composer state immediately and style data when the auth session becomes empty; login reloads `/style-data/me`. Good/Off posts to the scoped history endpoint, adjusts trait confidence/weight, writes a new snapshot, annotates the owned history row, and reloads visual data.

`GET /style-data/me` now pages through all `email_history` and `persona_snapshots` rows in 500-row ranges, preserving the requested ordering and applying the authenticated `user_id` filter on every page. A supplemental 1,203-row verification completed across three scoped pages. RLS defines authenticated owner-only CRUD on `style_profiles`, `email_history`, `persona_snapshots`, and `style_tags`.

Backend tests pass 20/20, frontend tests pass 3/3, and the Vite production build succeeds with bundled Node v24.14.0.

Verdict: the complete authenticated rewrite, finalization, profile refresh, session reload, and scoped feedback loop is integrated and verified.
