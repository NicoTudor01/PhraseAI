# PhraseAI Multi-Agent Audit

## Architecture & LLM Pipeline

### Fixed
- **P0:** Removed authenticated user IDs and raw `recent_examples` email excerpts from LLM prompts.
- **P1:** Moved synchronous Anthropic, OpenRouter, Supabase auth, and database calls off the FastAPI event loop with `asyncio.to_thread`.
- **P1:** Added input length limits, prompt truncation, and a clamped output-token budget.
- **P1:** Added explicit prompt boundaries and consistent system-level instructions across providers.
- **P1:** OpenRouter retries now stop on non-transient failures and use a shorter configurable timeout.
- **P2:** Rewrite responses identify `provider` versus `fallback` output.
- **P2:** Learning-event insert failures are logged without email content.

### Outstanding
- **P1:** Learning profile updates remain a read-modify-write sequence. Implement a transactional Postgres RPC before supporting concurrent finalization from multiple tabs/devices.
- **P2:** Streaming is not implemented. Add SSE only after the frontend interaction and provider abstraction are ready to support cancellation and partial output.
- **P2:** The personal style model is currently deterministic aggregate metadata, not embeddings, few-shot retrieval, or fine-tuning. Evaluate retrieval only after measuring rewrite quality with the current low-data approach.

## Frontend & UI

### Before
- Desktop-only two-column composer, clickable empty actions, invisible keyboard focus, and text-only loading feedback.
- Auth recovery links returned to the app without a set-password state.

### After
- Composer stacks below tablet widths; navigation/header/content adapt for mobile.
- Rewrite, copy, and finalize actions reflect true readiness and expose busy states.
- Added shared focus-visible, hover, transition, and rewrite-progress styling.
- Provider fallback is clearly identified without blocking user editing.
- Password recovery now has a dedicated update-password form.
- Rebuilt authentication as a focused two-column desktop experience that puts the form first on mobile.
- Reworked the authenticated shell with persistent navigation labels, compact status controls, and a five-item mobile bottom bar.
- Reframed the composer as a continuous input-to-output workflow with live counts, clearer rewrite modes, optional context, loading skeletons, and semantic feedback.
- Normalized light/dark theme tokens and verified both modes at a 390px mobile viewport without horizontal overflow.

### Remaining Polish
- Break `App.jsx` into focused auth, shell, composer, history, and profile components.
- Replace remaining inline styles with a small design-token/component layer.
- Add browser screenshot regression coverage for dark/light desktop and mobile layouts.
- Run the authenticated composer workflow against a dedicated non-production Supabase test account.

## Auth & Database

### Fixed
- Supabase session persistence is enabled by default; forced login is now opt-in.
- Authenticated API calls refresh an expired session once before failing.
- Password recovery handles `PASSWORD_RECOVERY` and updates the user password.
- Backend storage now requires service credentials instead of an anon-key fallback that conflicts with RLS.
- Added bounded profile validation and automatic `updated_at` maintenance.
- Wrapped the legacy auth-hardening migration in a transaction.

### Open Items
- Add optional name/use-case onboarding and initialize a profile after the first confirmed login.
- OAuth is not present; add it only when provider credentials and redirect URLs are defined.
- Client login throttling is UX-only. Configure Supabase Auth rate limits/CAPTCHA for production abuse controls.

## Security

| Severity | Risk | Status |
|---|---|---|
| High | Raw provider/database errors exposed to clients | Hardened with generic responses and sanitized logs |
| Medium | Prompt injection through draft/context/profile | Hardened with delimiters, invariant instructions, and validated profile keys |
| Medium | Prior emails/user UUID sent to LLM provider | Fixed; only derived style metadata is sent |
| Medium | Unbounded input and profile payload sizes | Fixed with Pydantic and profile JSON limits |
| Medium | Service-role bypass makes API query shape the isolation boundary | Documented and constrained to verified server-side user IDs |
| Medium | Migration could fail while RLS remained disabled | Fixed with transaction wrapper |
| Low | Broad CORS methods/headers | Restricted to required methods and headers |
| Low | Local developer path committed in simulator | Removed; simulator now accepts a CLI fixture |
| Low | Public model fingerprinting endpoint | Outstanding; consider hiding model/fallback details in production |

## Integration

### Added
- Root `.env.example` documents frontend, backend, provider, fallback, and input-limit variables.
- Unit coverage for prompt privacy, style-context filtering, and learning-profile updates.
- Backend syntax compilation and repository whitespace validation.

### Validation Status
- Backend unit tests: 3 passed.
- `python -m py_compile backend/app/main.py backend/scripts/simulate_learning.py`: passed.
- Frontend production build (`vite build`): passed.
- Browser desktop sign-in layout: passed.
- Browser mobile layout at 390x844: passed with no horizontal overflow.
- `git diff --check`: passed.
- Authenticated browser workflow was not exercised because local Supabase credentials are intentionally absent.

### Contract Notes
- `POST /rewrite` still returns `rewritten` and now also returns a backward-compatible `source` field.
- Existing authenticated routes and request bodies remain compatible.
- Browser fallback is limited to network/server failures; `4xx` validation/auth errors remain visible.
- The legacy database checklist now runs the UUID migration before current schema/policy scripts.

### Remaining Test Gaps
- Route-level tests still need mocked Supabase/provider clients for bearer validation, service-role query scoping, rewrite fallback status, and auth refresh behavior.
