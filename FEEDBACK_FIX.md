## Tracer — Call Chain

1. UI: `App.jsx:1441-1457` renders Good/Off from `entry.feedback.style_rating`; click calls `handleHistoryFeedback(id, rating)`.
   // TRACER: [GAP] `feedbackBusyId` blocks every concurrent click, but only the active row is disabled; other enabled-looking buttons silently do nothing.
   // TRACER: [GAP] Save failures use the same green `.history-feedback-message` styling as success.

2. Handler: `App.jsx:819-844` POSTs `/email-history/{id}/feedback`, falling back to `/style-feedback` only on 404, then calls `loadStyleData`.
   // TRACER: [GAP] The API already returns refreshed aggregate data, but the handler discards it and performs a second request.
   // TRACER: [GAP] `loadStyleData` catches refresh errors internally, so the handler still reports “Saved” while history/profile UI can remain stale.

3. API: `main.py:1597-1610` authenticates, binds the path `history_id`, validates `good|off`, and calls `apply_style_feedback`.
   // TRACER: [GAP] A missing or non-owned history row is not a 404: profile mutation still succeeds and the route returns 200.

4. DB/profile: `main.py:1218-1255` reads `style_profiles`, calls `adjust_profile_from_feedback`, writes profile/tags/snapshot, then updates `email_history.feedback.style_rating`.
   // TRACER: [GAP] One email rating scales every profile trait instead of only that history row's `influenced_traits`.
   // TRACER: [GAP] Repeated clicks and rating changes are not idempotent: each request rescales confidence/weight and increments counters, while history stores only the latest rating.
   // TRACER: [GAP] Read-modify-write has no concurrency guard; simultaneous feedback can lose updates.
   // TRACER: [GAP] Profile, tags, snapshot, and history are separate writes with no transaction/RPC; failures can leave partial state.

5. Schema/RLS: `20260610_data_architect_schema.sql:322-411` provides owner-only CRUD policies for all four tables.
   // TRACER: [GAP] Backend service-role writes bypass RLS, so isolation depends entirely on every application query retaining its explicit `user_id` filter.
   // TRACER: [GAP] Feedback is unconstrained JSONB at the database layer; valid rating/state transitions are enforced only by the API.

6. Tests: `test_pipeline.py:182-195,272-314` checks confidence direction and user scoping.
   // TRACER: [GAP] No test covers either API route, missing history, re-rating/idempotency, partial-write failure, concurrent updates, returned aggregate use, or frontend refresh/error behavior.

## Fixer — Changes Made

- Routed feedback persistence through `apply_style_feedback_atomic`, then returned the complete API aggregate without a frontend refetch while preserving 404/422 failures.
- Added RPC integration coverage for authenticated parameters, missing/non-owned history, repeated/rerated transitions, and no separate table writes.
- Made history feedback optimistic and row-specific, with independent pending state, inline success/error messages, rollback, and API aggregate consumption.
- Invalidated pending feedback on every auth transition so logout clears UI state and stale responses cannot cross into a later session.

## Guard — Security & Integrity

- `backend/sql/20260611_guard_style_feedback_atomic.sql` adds `apply_style_feedback_atomic(history_id, rating, user_id)` as one transactional, `SECURITY DEFINER` RPC.
- Authenticated calls are bound to `auth.uid()`; service-role calls must provide an explicit user id, and the locked history row must belong to that user.
- Missing/non-owned history and missing owned profiles are rejected before mutation. History is locked before profile so rapid clicks serialize consistently.
- `good|off` is database-validated. Only the history row's `influenced_traits` receive confidence/weight changes, with both values bounded to `0..1`.
- Same-rating retries are no-ops. Rating changes first remove the prior trusted delta and then apply the replacement delta, so retries cannot amplify weights and changes are reversible.
- The authoritative delta ledger lives in the non-exposed `private` schema because owner-writable `email_history.feedback` is not trustworthy for reversal math.
- History feedback, mirrored profile columns/timestamps, tags, snapshot, completeness, and the private ledger update atomically. Existing public-table owner-only RLS remains enabled.
- EXECUTE is revoked from `public`/`anon` and granted only to `authenticated` and `service_role`; private schema/table privileges are revoked from API roles.

Security finding: owner RLS permits users to edit their own visible `email_history.feedback`, so that JSON cannot be trusted as an adjustment ledger. The RPC therefore keeps authoritative deltas in the revoked `private` table and returns a fresh aggregate after each transition.

## Verifier — Test Results

- PASS: Backend tests — 25/25 passed.
- PASS: Frontend tests — 3/3 passed.
- PASS: Vite production build passed.
- PASS: Focused lifecycle/source-contract check verified every access-token transition increments the auth generation, clears pending/busy/message state, resets the aggregate on logout, and reloads the server aggregate on login.
- PASS: Stale feedback success, rollback, and finalizer branches are ignored before any state mutation; returned aggregates still update the style profile and feed the persona map.
- PASS: All requested feedback scenarios pass; no `// VERIFIER: [FAIL]` links remain.
