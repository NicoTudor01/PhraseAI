# PhraseAI AI Fallback Investigation

## DETECTIVE — Error Trace

The exact message `AI service is temporarily unavailable. Displaying a safe fallback rewrite.` exists only in `frontend/src/App.jsx` inside `handleRewrite`.

Trigger conditions:

1. `apiFetch("/rewrite")` throws.
2. The thrown error is not recognized as an authentication failure.
3. The error has no HTTP status or has a status of `500` or greater.
4. The browser's deterministic `localRewriteFallback()` returns text.

Call chain:

`Rewrite button` → `handleRewrite()` → `apiFetch("/rewrite")` → bearer token from Supabase → Railway `POST /rewrite` → FastAPI `get_current_user()` → Supabase token validation → style profile retrieval → prompt construction → Anthropic/OpenRouter call → provider or fallback response.

Important finding: with the deployed backend fallback enabled, Anthropic billing, credentials, rate-limit, model, timeout, and outage errors return HTTP 200 with `source: "fallback"` and a categorized `fallback_reason`. They do not produce the exact old browser sentence. That sentence therefore indicates a statusless browser/network failure, a backend/auth failure before the route fallback, or an uncategorized backend `5xx`.

Hidden-error locations:

- `frontend/src/App.jsx`: statusless `fetch()` and Supabase session exceptions are converted to the generic browser fallback without diagnostic logging.
- `backend/app/main.py`: profile retrieval failure is replaced with an empty profile.
- `backend/app/main.py`: fallback-disabled provider errors are flattened to a generic `502`.
- Production Railway logs and private environment values are not accessible from the repository; Railway CLI requires the owner's login.

## SHARED MEMORY — Detective + Inspector

- DETECTIVE: The exact old sentence is not the normal provider fallback path after commit `b884361`.
- DETECTIVE: Investigate frontend session retrieval, CORS/network reachability, backend Supabase auth configuration, and any `5xx` generated before `rewrite_email`.
- INSPECTOR: The old browser fallback proves only that `handleRewrite` received a statusless or `5xx` non-auth exception. The original error was discarded.
- INSPECTOR: Missing frontend Supabase configuration, rejected `getSession()`/refresh calls, and network/preflight failures were all incorrectly labeled as AI-provider outages.
- INSPECTOR: Public verification passed for Railway health, canonical Vercel CORS preflight, unauthenticated error shape, model `claude-sonnet-4-6`, and enabled backend fallback.
- INSPECTOR: The most likely root cause is a frontend transport/session exception being misclassified; provider failures reached by the backend already return categorized HTTP 200 fallbacks.

## INSPECTOR — Log & State Analysis

- Frontend session and refresh errors were ignored or thrown without a diagnostic stage.
- Non-JSON proxy errors were reduced to an empty object, erasing useful response evidence.
- The browser had no request timeout or correlation identifier.
- Backend Supabase configuration failures can occur before the provider fallback boundary.
- Production CORS for `https://phraseai-nico.vercel.app` was verified successfully.
- Private Railway environment values and logs remain inaccessible without the project owner's Railway login.

## SCOUT — AI Provider Options

Immediate backup recommendation: OpenRouter is already supported and is the lowest-effort backup, but production should use funded inexpensive models rather than depending only on `:free` quotas. For independent provider diversity, Groq is the easiest next adapter because it is OpenAI-compatible and optimized for low latency. Gemini Flash is another strong low-cost option. Ollama is suitable for local development but adds hosting/runtime requirements in production.

Recommended chain: Anthropic primary → funded OpenRouter or Groq secondary → deterministic backend fallback.

## ARCHITECT — AI Integration Structure

- The frontend inferred provider failure from HTTP shape, even when the provider was never reached.
- Browser and backend deterministic fallbacks duplicated logic and drifted in behavior.
- Authentication validity, authentication-service availability, transport errors, backend errors, and provider errors lacked distinct contracts.
- Prompt construction sat outside the provider error boundary and could produce a misleading pre-provider `500`.
- Recommended pattern: make the backend the sole fallback owner and return typed stage/code/request identifiers. The frontend should display transport, session, backend, and provider outcomes distinctly.

## TESTER — Reproduction & Validation

Implemented regression coverage:

| Scenario | Expected behavior | Result |
|---|---|---|
| Invalid/unauthorized provider (`401`) | Categorized as `authentication`; backend owns fallback | Pass |
| Provider billing failure (`402`) | HTTP 200 deterministic fallback with `billing` reason and request ID | Pass |
| Provider rate limit (`429`) | HTTP 200 deterministic fallback with `rate_limited` reason | Pass |
| Anthropic/provider timeout | HTTP 200 deterministic fallback with `timeout` reason | Pass |
| OpenRouter adapter timeout | Preserved as HTTP 504 and categorized as timeout | Pass |
| Malformed OpenRouter response | Rejected as provider failure | Pass |
| Prompt construction exception | Typed HTTP 500 with `stage: prompt` and request ID | Pass |
| Empty or whitespace-only draft | Rejected by request validation before provider work | Pass |
| Malformed successful frontend rewrite response | Rejected instead of rendering empty output | Pass |
| Frontend production build | Same-origin API client and typed errors compile | Pass |
| Legacy generic fallback string | Removed from runtime source | Pass |

TESTER initially found three defects in the first patch: OpenRouter timeout classification, whitespace-only drafts, and malformed successful response validation. All three were fixed before deployment.

Backend suite: 13 passed. Frontend production build: passed.

## MONITOR — Observability

- Add privacy-safe structured events containing request ID, provider, actual model, estimated prompt tokens, latency, status, HTTP status, fallback category, and exception class.
- Never log drafts, prompts, context, outputs, emails, user IDs, tokens, provider response bodies, or exception messages.
- Track fallback rate in a bounded rolling window and emit an alert event above a configurable threshold.
- Show diagnostic details only in development.

## ROOT CAUSE SUMMARY

The root cause was not a single Anthropic exception: it was incorrect ownership and classification of failures. PhraseAI had one informed fallback in FastAPI and a second uninformed fallback in React. React interpreted every statusless session/network error and every backend `5xx` as “AI service unavailable,” generated its own rewrite, and discarded the real stage. This made Supabase session failures, transport/CORS/proxy failures, prompt-construction errors, and backend configuration errors look identical to provider outages. The fix makes FastAPI the sole rewrite fallback owner, routes production requests through Vercel’s same-origin `/api` proxy, returns request IDs and typed stages, adds privacy-safe structured logging and fallback-rate alerts, bounds browser requests, handles session/bootstrap errors explicitly, and removes the misleading browser-generated fallback. A funded secondary provider remains recommended for true AI-provider redundancy.
