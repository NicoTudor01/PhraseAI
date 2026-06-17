## Research — Writing Style Dimensions

Sources used:
- Stylometry: style can be measured through lexical statistics, average sentence/word length, punctuation, function-word patterns, contractions, passive constructions, and other writer-invariant habits. Source: https://en.wikipedia.org/wiki/Stylometry
- Email politeness research: perceived email politeness depends heavily on imposition, power distance, social distance, and explicit politeness strategies. Source: https://arxiv.org/abs/1908.11752
- LLM email research: LLM rewrites tend to homogenize emails toward higher formality and empathy; PhraseAI must preserve human variance rather than always pushing everyone toward the same corporate tone. Source: https://arxiv.org/abs/2603.20231
- Email behavior research: reply length and style shift with load, device, and conversation stage; response length relative to context should be tracked separately from absolute length. Source: https://arxiv.org/abs/1504.00704

Style dimensions to track:
- Structure: word count, sentence count, average sentence length, paragraph count, paragraph density, bullet/list usage, opener type, closer type, subject style, context-first vs ask-first rhythm.
- Tone: formality, warmth, empathy, confidence/assertiveness, urgency, tact, emotionality, optimism, enthusiasm, restraint.
- Linguistics: vocabulary richness, word precision, contraction usage, active/passive voice ratio, sentence complexity, punctuation habits, filler phrases, recurring phrases, function-word/pronoun patterns, first-person vs collaborative framing.
- Rhythm: ask placement, pacing, whitespace, list preference, response length tendency, response length relative to incoming email length, single-thought vs multi-step composition.
- Interpersonal: directness, deference markers, reciprocity, relationship acknowledgement, politeness markers, softeners, humor/personality, apology tendency.
- Stability signals: each trait needs score, confidence, evidence count, trend, and recalibration status so early data does not overfit one email.
- Privacy decision: store derived traits and bounded excerpts only. Do not build UI or prompts around raw long-term email storage unless the user explicitly saved that row as history.

## Research — Current State

Relevant files:
- `Coding/frontend/src/App.jsx`: single large React app containing auth, rewrite composer, Style Profile, history feed, API calls, feedback handlers, and custom SVG persona map.
- `Coding/frontend/src/index.css`: all UI styling, including existing Style Profile cards, persona map SVG, timeline, history feed, feedback controls, and responsive states.
- `Coding/frontend/package.json`: React 19, Supabase JS, and Framer Motion are already installed. No graph library is installed.
- `Coding/backend/app/main.py`: FastAPI routes, LLM provider dispatch, prompt construction, deterministic style extraction, profile merge, persistence helpers, and feedback route handling.
- `Coding/backend/sql/20260610_data_architect_schema.sql`: current style_profiles, email_history, persona_snapshots, style_tags schema and owner-scoped RLS.
- `Coding/backend/sql/20260611_guard_style_feedback_atomic.sql`: atomic `good/off` feedback RPC with private adjustment ledger and owner checks.

Current strengths:
- Style data is already user-scoped through `user_id` and RLS on public style tables.
- `email_history`, `style_profiles`, `style_tags`, and `persona_snapshots` already exist.
- Feedback uses `apply_style_feedback_atomic`, which locks rows and updates feedback/profile/tags/snapshots in one transaction.
- Existing style extraction tracks sentence length, vocabulary richness, punctuation counts, openers/closers, recurring phrases, language shifts, politeness/hedging ratios, pronoun focus, and profile completeness.
- Frontend already renders a Style Profile page with persona map, summary card, strength bar, evolution timeline, and history feedback.

Gaps against the rebuild target:
- Schema does not expose first-class `persona_label`, `persona_summary`, `profile_completeness`, or `emails_analyzed` columns on `style_profiles`; these are embedded or inferred.
- There is no public `style_feedback` table for `good/off/edited` events with optional trait and user note. Current feedback is embedded in `email_history.feedback` plus private adjustment ledger.
- Feedback only supports `good` and `off`; no manual-edit learning flow exists.
- AI extraction is deterministic only. There is no structured LLM extraction prompt returning full trait JSON and no second persona-summary generation call.
- Profile merge uses fixed EWMA-style alpha, not the requested `1 / (1 + emails_analyzed)` merge weight and logarithmic confidence growth.
- Active/passive voice, warmth, empathy, urgency, deference, reciprocity, humor, filler phrase frequency, subject-line style, ask placement, and relative response length are not fully represented as score/confidence/trend traits.
- Persona map is a static custom SVG, not interactive with hover tooltips, drawer details, sparklines, or drifting physics.
- Timeline is present but minimal; it does not compare snapshot vs current or calculate “X% more defined.”
- Trait cards, edited feedback textarea, feedback-impact summary, and sticky/persistent profile health meter are missing.
- Style page uses existing light card system. Rebuild target asks for a darker `#171717` profile dashboard with green accent and scroll-triggered Framer Motion sections.

Decision log:
- Use the existing Framer Motion dependency instead of installing a new animation library.
- Use a custom SVG/React mental map rather than adding a graph dependency unless the static map becomes too complex; this avoids dependency weight and keeps animation control local.
- Preserve existing API compatibility while adding richer fields and new routes/tables.
- Keep service-role backend persistence as the write path; browser reads should remain user-scoped through existing API calls and/or RLS-safe Supabase reads.

## Data Architect — Schema

Migration written:
- `Coding/backend/sql/20260616_style_rebuild_schema.sql`

Schema decisions:
- `style_profiles` now has first-class dashboard columns in addition to the existing JSON contract: `persona_label`, `persona_summary`, `profile_completeness`, `emails_analyzed`, `last_updated`.
- `style_profiles.profile` remains the source of complete trait JSON so older backend/frontend code keeps working.
- `sync_style_profile_columns()` was upgraded to mirror `profile/current_style` and derive dashboard columns when older code writes only JSON.
- `style_feedback` was added as a public immutable event stream: `rewrite_id`, `user_id`, `feedback_type`, `trait_affected`, `user_note`, `manual_edit`, `metadata`, timestamps.
- `persona_snapshots` now includes `source_history_id`, `persona_label`, and `persona_summary` so timeline points can explain what changed and which email caused the snapshot.
- RLS is enabled on `style_feedback`; policies require both `auth.uid() = user_id` and ownership of the linked `email_history` row.
- Indexes were added for feedback feed, rewrite-specific feedback history, and snapshot source lookup.

Gaps remaining after schema:
- Existing feedback RPC still handles only `good/off`; AI Pipeline must extend behavior for `edited` events and public `style_feedback` rows.
- Existing backend profile JSON still uses old trait shape in parts of the code; AI Pipeline must migrate output toward `score/confidence/trend` consistently.

## AI Pipeline — Extraction & Update Logic

Files changed:
- `Coding/backend/app/main.py`

Implemented logic:
- Added structured LLM extraction prompt via `build_style_extraction_prompt()`.
- Added `extract_style_traits_with_llm()` to request JSON-only trait scoring after a user approves a final version.
- Added `merge_llm_style_extraction()` so LLM scores nudge deterministic traits instead of replacing the profile.
- Added deterministic fallback scoring for all core style dimensions: formality, warmth, confidence, directness, urgency, empathy, reciprocity, humor, active voice, contractions, deference, fillers, ask placement, sentence structure, length tendency, punctuation personality.
- Added logarithmic confidence growth with `_confidence_from_count()`.
- Added weighted merge behavior through `_merge_dimension_score()`, using earlier emails as stronger shaping data and later emails as fine-tuning.
- Added `persona_label`, `persona_summary`, `profile_completeness`, and `emails_analyzed` into the stored profile JSON.
- Added public `style_feedback` event persistence for feedback impact history.
- Added `edited` feedback support: manual edits become a new learning sample, recalibrate traits, update email history, save a new snapshot, and write a feedback event.

Behavior:
- `/learn` now runs deterministic extraction first, attempts LLM extraction second, and falls back safely if provider extraction fails.
- `good/off` feedback still uses the existing atomic RPC for profile confidence updates, then records a public feedback event for UI visibility.
- `edited` feedback currently uses backend service-role writes across history/profile/feedback. It is user-scoped but not yet a single SQL RPC transaction.

Remaining integration note:
- For stricter atomicity, `edited` feedback should eventually move into a dedicated RPC similar to `apply_style_feedback_atomic`.

## Frontend — Style Profile UI

Files changed:
- `Coding/frontend/src/App.jsx`
- `Coding/frontend/src/index.css`

Implemented views:
- Persona Header: full-width dark hero with persona label, persona summary, animated completeness ring, analyzed-email count, and trait chips.
- Interactive Mental Map: upgraded SVG map with score/confidence-aware node sizing, animated edge drawing, hover/focus behavior, clickable nodes, and a side drawer with score, confidence, trend, and sparkline.
- Style Evolution Timeline: snapshot timeline remains horizontal, now includes persona labels and “profile is X% more defined” copy when enough snapshots exist; fewer than 3 snapshots show a soft empty state.
- Trait Breakdown Cards: grid of style dimensions with animated score bars, confidence dots, trend badges, and human descriptions.
- Email History Feed with Feedback: entries animate in on scroll, originals can expand, good/off feedback remains optimistic, and “I’d write it like this” opens an inline editor that submits `edited` feedback.
- Style Strength Meter: animated ring plus adaptive guidance based on completeness.
- Feedback Impact Summary: shows last feedback events and explains whether the event reinforced, recalibrated, or adjusted traits.

Animation decisions:
- Used existing Framer Motion dependency.
- Section entrances use `whileInView`, `viewport={{ once: true, margin: "-80px" }}`, y/opacity transforms, and staggered children.
- Bars, ring, node edges, feed rows, and drawer transitions animate with transform/opacity/stroke only.
- No new graph dependency was added; custom SVG keeps the interaction lightweight.

UI decisions:
- Dark dashboard palette centers on `#171717` with green accent `#4ade80`.
- Existing light/dark app theme remains intact outside the Style Profile rebuild.
- Empty states remain graceful for new users with no analyzed emails.

## Integration — Loop Verification

Automated verification:
- Backend unit tests: `28 passed`.
- Frontend unit tests: `3 passed`.
- Frontend production build: passed.
- `git diff --check`: passed.

Loop checks:
- User submits email -> `/learn` updates profile JSON, persona fields, tags, and snapshots. PASS by backend tests and code path review.
- User clicks `good` -> atomic RPC updates confidence, public `style_feedback` event is written, API returns refreshed aggregate. PASS by updated persistence tests.
- User clicks `off` -> same flow with confidence reduction and event logging. PASS by updated persistence tests.
- User submits manual edit -> inline editor sends `rating: "edited"` with `manual_edit`; backend recalibrates traits, updates history, saves snapshot, writes feedback event. PASS by code path review; needs live Supabase migration before browser verification.
- Logout/login persistence -> aggregate loads from server-backed tables keyed by user ID. PASS by RLS/schema review and existing auth aggregate path.
- New user with 0 emails -> Style Profile shows empty state and first-rewrite CTA. PASS by frontend code path review.

// INTEGRATION: [BROKEN] Edited feedback is user-scoped but not yet a single SQL transaction/RPC. Good/off feedback remains atomic through `apply_style_feedback_atomic`.

Verdict:
- The Style Profile rebuild is implemented and test-clean locally. The only remaining production dependency is applying `Coding/backend/sql/20260616_style_rebuild_schema.sql` to Supabase before testing the new `style_feedback` table and edited-feedback loop live.
