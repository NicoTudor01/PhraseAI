# PhraseAI Reconnaissance Notes

## CARTOGRAPHER — Project File Map

Generated dependency/build directories (`node_modules`, virtual environments, caches, `dist`, and `.git`) are not source-owned project files and are excluded from the reading map. The repository contains 45 tracked project files.

```text
PhraseAI/
├── .dockerignore                              # Config: excludes local, Git, frontend dependency/build, and Python cache files from Docker context.
├── .env.example                               # Environment reference: documents frontend, backend, provider, Supabase, limits, fallback, and monitoring variables.
├── .gitignore                                 # Config: repository-level ignored files and directories.
├── AGENT_NOTES.md                             # Documentation: prior multi-agent audit findings, completed hardening work, open items, and validation status.
├── DEBUG_NOTES.md                             # Documentation: prior AI fallback investigation, root-cause analysis, regression results, and observability notes.
├── Dockerfile                                 # Deployment config: Python 3.11 image that installs backend requirements and starts FastAPI with Uvicorn.
├── README.md                                  # Documentation: product overview, setup, environment, Supabase schema, API contract, and deployment instructions.
├── nixpacks.toml                              # Deployment config: Railway/Nixpacks Python version, backend dependency install, and Uvicorn start command.
├── package.json                               # Workspace manifest: root convenience scripts forwarding dev/build/preview commands to the frontend.
├── railway.toml                               # Deployment config: Railway Dockerfile build, backend start command, and restart policy.
├── requirements.txt                           # Dependency bridge: points root Python installers to backend/requirements.txt.
├── vercel.json                                # Deployment config: root-level Vercel Vite build and same-origin /api proxy to Railway.
├── backend/
│   ├── Procfile                               # Deployment config: alternate Uvicorn web process declaration.
│   ├── requirements.txt                       # Backend dependencies: FastAPI, Uvicorn, dotenv, Supabase client, and Anthropic client.
│   ├── app/
│   │   ├── __init__.py                        # Package marker: declares backend/app as a Python package.
│   │   └── main.py                            # Backend core: FastAPI app, auth, API routes, provider clients, rewrite pipeline, fallback, learning, profile, logging, and limits.
│   ├── scripts/
│   │   └── simulate_learning.py               # Developer utility: drives synthetic learning examples through the profile update logic.
│   ├── sql/
│   │   ├── auth_hardening_migration.sql       # Migration: converts legacy user IDs to auth UUIDs, adds constraints/indexes, and restores RLS transactionally.
│   │   ├── learning_events.sql                # Schema: creates learning event history, ownership policies, index, grants, and RLS.
│   │   └── style_profiles.sql                 # Schema: creates per-user JSON style profiles, timestamp trigger, ownership policies, grants, and RLS.
│   └── tests/
│       └── test_pipeline.py                    # Backend tests: prompt privacy/filtering, learning aggregation, provider error behavior, and rewrite route contracts.
└── frontend/
    ├── .gitignore                             # Frontend config: Vite/Node-specific ignored files.
    ├── README.md                              # Documentation: mostly unchanged generic React + Vite template guidance.
    ├── eslint.config.js                       # Tooling config: flat ESLint rules for JavaScript, React hooks, and Vite refresh.
    ├── index.html                             # Frontend entry document: Vite HTML shell and root mount node.
    ├── package-lock.json                      # Dependency lock: exact npm dependency graph for reproducible frontend installs.
    ├── package.json                           # Frontend manifest: React, Supabase, Vite, Tailwind/PostCSS, and Node test scripts.
    ├── postcss.config.js                      # Styling config: enables Tailwind CSS and Autoprefixer.
    ├── tailwind.config.js                     # Styling config: source scanning plus a custom glow box shadow.
    ├── vercel.json                            # Deployment config: frontend-root Vercel build and /api proxy to Railway.
    ├── vite.config.js                         # Build/dev config: React plugin and local /api proxy to FastAPI on port 8000.
    ├── public/
    │   ├── favicon.svg                        # Asset: empty placeholder favicon file.
    │   ├── icons.svg                          # Asset: SVG symbol sheet for interface icons.
    │   └── visuals/
    │       ├── story-atelier.svg              # Asset: decorative illustration for the style/atelier product story.
    │       ├── story-contact.svg              # Asset: decorative illustration for the contact/context product story.
    │       └── story-motion.svg               # Asset: decorative illustration for the rewrite/motion product story.
    ├── src/
    │   ├── App.css                            # Styles: legacy/component-level Vite and application CSS alongside the larger global stylesheet.
    │   ├── App.jsx                            # Frontend core: all auth screens, shell, navigation, composer, history, profile, settings, state, Supabase, and API integration.
    │   ├── index.css                          # Styles: Tailwind directives, theme tokens, responsive layout, auth, shell, composer, feedback, and animation rules.
    │   ├── main.jsx                           # Entry point: mounts the React App into the DOM under StrictMode.
    │   ├── rewriteResponse.js                 # Utility: validates and normalizes successful backend rewrite responses.
    │   └── assets/
    │       ├── hero.png                       # Asset: raster hero artwork used by the frontend.
    │       ├── react.svg                      # Asset: empty leftover React template placeholder.
    │       └── vite.svg                       # Asset: minimal leftover Vite template SVG.
    └── tests/
        └── rewriteResponse.test.js             # Frontend tests: Node test coverage for rewrite response validation and malformed payload rejection.
```

### Architectural Placement

- Frontend: `frontend/`, implemented as a Vite React single-page application; almost all runtime UI logic is concentrated in `frontend/src/App.jsx`.
- Backend: `backend/app/main.py`, implemented as one FastAPI module containing routes, schemas, authentication, provider adapters, fallback logic, persistence, and learning logic.
- Data/Supabase: SQL definitions and migration scripts live in `backend/sql/`; frontend Supabase Auth and backend service-role database access are embedded in their respective core files.
- LLM integration: provider selection, Anthropic/OpenRouter calls, prompt construction, deterministic fallback, and style learning are all in `backend/app/main.py`.
- Tests: backend pipeline/route tests are in `backend/tests/`; the frontend has a focused response-validator test in `frontend/tests/`.
- Deployment: Vercel configuration exists at both repository root and `frontend/`; Railway supports Dockerfile, Nixpacks, Procfile, and `railway.toml` entry paths.

### Convention and Placement Notes

- `frontend/src/App.jsx` and `backend/app/main.py` are unusually large, multi-responsibility core files relative to the otherwise small repository.
- `frontend/README.md`, `frontend/src/assets/react.svg`, and `frontend/src/assets/vite.svg` appear to be Vite template remnants; two of those asset files are empty or effectively empty.
- `frontend/public/favicon.svg` is empty and functions as a placeholder rather than a real favicon.
- `App.css` coexists with a much larger `index.css`; their exact active/legacy relationship belongs to the frontend deep read.
- Vercel proxy configuration is duplicated at root and under `frontend/`, likely supporting two possible Vercel root-directory configurations.
- Railway startup configuration is represented four ways (`Dockerfile`, `railway.toml`, `nixpacks.toml`, and `backend/Procfile`), reflecting deployment compatibility rather than one canonical mechanism.
- `AGENT_NOTES.md` and `DEBUG_NOTES.md` document prior audits and fixes but are not runtime inputs.
- The repository directory is named `PharseAI` while the product and child project directory are named `PhraseAI`.

## SHARED MEMORY — Project Root

PhraseAI is a compact monorepo with a Vite React frontend in `frontend/` and a FastAPI backend in `backend/`. The frontend runtime is centered in one large `App.jsx` file with global styling primarily in `index.css`. The backend runtime is centered in one large `main.py` file containing API, auth, AI, persistence, learning, fallback, and observability logic. Supabase provides authentication and Postgres storage, with schema and RLS scripts under `backend/sql/`. Anthropic is the named primary AI client, while the backend also contains OpenRouter-compatible behavior and a deterministic local fallback. The principal persisted entities are user style profiles and learning events. Frontend production traffic is routed through a same-origin Vercel `/api` proxy to a Railway-hosted backend. Configuration is documented in `.env.example`, with separate expected runtime env files for frontend and backend. Tests cover core backend pipeline behavior and frontend rewrite-response validation, while prior audit documents record broader manual and build validation. The project is source-small but architecturally dense because most behavior is concentrated in two core files.

## CONFIG READER — Environment & Tooling

Cross-reference: the file boundaries and deployment placements below use `## CARTOGRAPHER — Project File Map`; runtime behavior is checked against `## SHARED MEMORY — Project Root`, `AGENT_NOTES.md`, and `DEBUG_NOTES.md`.

### Manifests, Locks, and Dependency Roles

- Root `package.json` is a private `phraseai-workspace` convenience manifest with no dependencies. Its scripts forward frontend development, build, and preview commands into `frontend/`.
- `frontend/package.json` is a private ESM package. Runtime dependencies are React, React DOM, and the Supabase browser client. Development dependencies are Vite, the Vite React plugin, Tailwind CSS, PostCSS, and Autoprefixer.
- `frontend/package-lock.json` is npm lockfile v3 with package name/version aligned to the frontend manifest, `requires: true`, and a `packages` map rather than a legacy top-level dependency graph. It contains 135 non-root package entries: 12 runtime entries, 123 development entries, 32 optional entries, and one install-script entry (`fsevents`). Integrity hashes and registry URLs are recorded for all resolved packages.
- Exact locked direct versions are `@supabase/supabase-js` 2.108.0, React 19.2.6, React DOM 19.2.6, `@vitejs/plugin-react` 6.0.2, Autoprefixer 10.5.0, PostCSS 8.5.15, Tailwind CSS 3.4.19, and Vite 8.0.14.
- The runtime lock subtree is Supabase plus its Auth, Functions, PostgREST, Realtime/Phoenix, and Storage clients; React plus React DOM/Scheduler; and shared `tslib`/`iceberg-js` support.
- The development lock subtree is primarily Vite 8/Rolldown/Oxc and platform-specific Rolldown bindings; Lightning CSS and platform bindings; Tailwind/PostCSS and config/file-watching/globbing utilities; Browserslist compatibility data; source-map utilities; and Sucrase/Jiti configuration loaders.
- Locked Vite, Rolldown, and `@vitejs/plugin-react` declare Node `^20.19.0 || >=22.12.0`; locked Supabase packages declare Node `>=20.0.0`. React itself has a much older minimum.
- Root `requirements.txt` is only `-r backend/requirements.txt`, allowing root-oriented Python installers to resolve the backend manifest.
- `backend/requirements.txt` pins five direct dependencies but has no transitive lockfile: FastAPI 0.116.1 provides the API/Pydantic integration; Uvicorn 0.35.0 with standard extras is the ASGI server; python-dotenv 1.0.1 loads `backend/.env` when the process starts from `backend/`; Supabase 2.15.3 provides Auth validation and PostgREST database access; Anthropic 0.58.2 provides the direct Claude client.

### Configuration and Entrypoints

- Browser entry sequence: `frontend/index.html` loads `/src/main.jsx`; `main.jsx` imports `index.css`, mounts `App.jsx` under React `StrictMode`, and `App.jsx` creates the Supabase client and all UI/API behavior. `App.css` is not imported by the current entry sequence.
- Backend entry sequence: every server launcher targets `app.main:app`; importing `backend/app/main.py` calls `load_dotenv()`, reads four size limits at module load, constructs FastAPI 0.2.0, and configures CORS. `backend/app/__init__.py` is empty.
- Local Vite serves on its own default host/port when run inside `frontend`; the root `dev` wrapper explicitly binds `0.0.0.0:5173`. `vite.config.js` proxies `/api/*` to `http://localhost:8000/*`, strips `/api`, and changes the origin.
- ESLint uses flat config for `*.js`/`*.jsx`, browser globals, recommended JavaScript rules, React Hooks rules, and Vite refresh rules, while ignoring `dist`.
- PostCSS runs Tailwind CSS then Autoprefixer. Tailwind scans `frontend/index.html` and `frontend/src/**/*.{js,jsx,ts,tsx}` and adds one `glow` box shadow.
- The learning simulator entrypoint is `backend/scripts/simulate_learning.py`; from `backend/`, it accepts one JSON dataset path containing `phaseA` and `phaseB`, imports the production learning schema/update function, and prints profile changes.
- Backend tests use Python `unittest`; the test module inserts `backend/` on `sys.path` and has a direct `unittest.main()` entrypoint. Frontend tests use Node's built-in test runner.

### Environment Variable Map

| Variable | Runtime use | Code default/effective behavior |
|---|---|---|
| `VITE_API_URL` | Frontend API base in Vite development only | Development falls back to `/api`; production always uses `/api` and ignores this variable. |
| `VITE_SUPABASE_URL` | Browser Supabase project URL | Empty string; missing URL prevents client creation. |
| `VITE_SUPABASE_ANON_KEY` | Browser Supabase public/anon key | Empty string; missing key prevents client creation. |
| `VITE_FORCE_LOGIN_ON_VISIT` | Optional browser session reset for test deployments | `"false"`; only case-insensitive `"true"` enables it. |
| `ANTHROPIC_API_KEY` | Required credential for both Anthropic and OpenRouter paths | No default; missing value raises backend configuration errors. An `sk-or-` prefix also selects OpenRouter. |
| `ANTHROPIC_BASE_URL` | Anthropic-compatible base URL and OpenRouter selector | Unset/empty means direct Anthropic. A value containing `openrouter.ai` selects OpenRouter; `/api` is normalized to `/api/v1`. |
| `ANTHROPIC_TIMEOUT_SECONDS` | Anthropic client timeout | `30`; invalid input returns to 30, then value is clamped to 5–120 seconds. |
| `ANTHROPIC_MAX_RETRIES` | Anthropic SDK retry count | `2`; invalid input returns to 2, then value is clamped to 0–5. |
| `LLM_MODEL` | Preferred provider model | Empty selects `claude-sonnet-4-6` for Anthropic or `OPENROUTER_DEFAULT_MODEL` for OpenRouter. The deprecated Anthropic pin `claude-sonnet-4-20250514` is replaced at runtime. |
| `LLM_MAX_TOKENS` | Rewrite output-token budget | `1200`; invalid input returns to 1200, then value is clamped to 128–2400. |
| `SUPABASE_URL` | Backend Supabase project URL | No default; required when authenticated/storage operations run. |
| `SUPABASE_SERVICE_ROLE_KEY` | Primary backend Supabase credential | No default; required unless the compatibility alias is present. |
| `SUPABASE_KEY` | Backwards-compatible backend credential alias | No default; used only when `SUPABASE_SERVICE_ROLE_KEY` is absent. |
| `FRONTEND_ORIGIN` | Additional comma-separated CORS origins | Empty string. Hardcoded localhost, canonical production, three Vercel preview origins, and a PhraseAI preview regex are added regardless. |
| `OPENROUTER_DEFAULT_MODEL` | OpenRouter model when `LLM_MODEL` is empty | `meta-llama/llama-3.1-8b-instruct:free`. |
| `OPENROUTER_FALLBACK_MODELS` | Comma-separated retry candidates after the preferred OpenRouter model | Code default has Llama 3.1 8B free, Qwen 2.5 7B free, Mistral 7B free, and `openrouter/auto`; blanks are removed and duplicates are skipped later. |
| `OPENROUTER_TIMEOUT_SECONDS` | Per-attempt OpenRouter HTTP timeout | `25`; parsed directly as float without an invalid-value fallback. |
| `OPENROUTER_SITE_URL` | Optional OpenRouter `HTTP-Referer` attribution header | Empty; when empty, neither attribution header is sent. |
| `OPENROUTER_APP_TITLE` | Optional OpenRouter `X-Title` attribution header | `PhraseAI`; sent only when `OPENROUTER_SITE_URL` is non-empty. |
| `ENABLE_LOCAL_REWRITE_FALLBACK` | Enables deterministic backend rewrite after provider failure | Effective default `true`; accepted true values are `1`, `true`, `yes`, and `on` after trimming/case folding. |
| `MAX_DRAFT_CHARS` | Pydantic draft limit and prompt truncation limit | `12000`; parsed as integer at import time. |
| `MAX_CONTEXT_CHARS` | Pydantic context limit and prompt truncation limit | `8000`; parsed as integer at import time. |
| `MAX_FINAL_CHARS` | Learning AI/final text limit | `12000`; parsed as integer at import time. |
| `MAX_PROFILE_JSON_CHARS` | Serialized profile payload limit | `24000`; parsed as integer at import time. |
| `ALLOW_DEV_STRESS_TEST` | Gates `POST /dev/stress-test` | `"false"`; enabled only when `.lower()` equals `"true"` exactly. |
| `FALLBACK_ALERT_WINDOW_SECONDS` | Rolling rewrite outcome window | `300`; read and parsed on every outcome. |
| `FALLBACK_ALERT_MIN_REQUESTS` | Minimum window sample count before alerting | `10`; read and parsed on every outcome. |
| `FALLBACK_ALERT_RATE` | Fallback-rate alert threshold | `0.25`; read and parsed on every outcome. |
| `FALLBACK_ALERT_COOLDOWN_SECONDS` | Minimum time between fallback alerts | `300`; read and parsed on every outcome. |
| `PORT` | Hosting-provided Uvicorn listen port | Dockerfile, `railway.toml`, and Procfile fall back to 8000; Nixpacks requires the supplied value. |
| `PYTHONDONTWRITEBYTECODE` | Docker Python runtime behavior | Set to `1` in the image. |
| `PYTHONUNBUFFERED` | Docker log buffering behavior | Set to `1` in the image. |
| `NIXPACKS_PYTHON_VERSION` | Nixpacks Python selection | Set to `3.11` in `nixpacks.toml`. |

`.env.example` is a reference file, not a runtime file. The documented runtime files are `frontend/.env` and `backend/.env`; root `.env`, both scoped `.env` files, and frontend `.env*` variants are ignored. `load_dotenv()` searches from the backend process context, and all documented backend launch commands change or set the working directory to `backend`.

### Commands and Execution Paths

| Purpose | Command/path declared by repository |
|---|---|
| Root frontend development | `npm run dev` → `npm --prefix frontend run dev -- --host 0.0.0.0 --port 5173` |
| Frontend development | `cd frontend && npm run dev` → `vite` |
| Root/frontend production build | `npm run build` or `cd frontend && npm run build` → `vite build` |
| Root/frontend preview | `npm run preview` or `cd frontend && npm run preview` → `vite preview` |
| Frontend tests | `cd frontend && npm test` → `node --test tests/*.test.js` |
| Backend local install | `cd backend && python -m venv .venv`, activate, then `pip install -r requirements.txt` |
| Backend local development | `cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000` |
| Backend tests | Test module supports `python -m unittest discover -s backend/tests` from root or direct execution of `backend/tests/test_pipeline.py`; no package/root test script declares it. |
| Learning simulation | `cd backend && python scripts/simulate_learning.py <dataset.json>` |
| Docker image build/start | Install `backend/requirements.txt`, copy only `backend/`, then run Uvicorn from `/app/backend` on `${PORT:-8000}` |
| Railway Docker deployment | Root `railway.toml` selects the Dockerfile builder and restates Uvicorn as the start command with on-failure restart, maximum 10 retries. |
| Railway Nixpacks alternative | Python 3.11, install root-relative `backend/requirements.txt`, then `cd backend` and run Uvicorn on `${PORT}`. |
| Procfile alternative | Run Uvicorn from a backend-root deployment on `${PORT:-8000}`. |
| Vercel root configuration | Install/build through `npm --prefix frontend`, publish `frontend/dist`, proxy `/api/*` to Railway. |
| Vercel frontend-root configuration | Run npm in `frontend`, publish `dist`, proxy `/api/*` to the same Railway URL. |

There is no root `test` script, no declared lint script, no backend script manifest, and no single command that starts frontend and backend together.

### Hosting Topology

- Production browser assets are built by Vercel from either repository root or `frontend/`; both Vercel configs produce the same Vite application and hard-code `/api/(.*)` to `https://phraseai-production.up.railway.app/$1`.
- Production `App.jsx` always calls same-origin `/api`, so Vercel owns the browser-to-backend routing boundary. The rewrite removes `/api` before the request reaches FastAPI.
- Railway hosts the FastAPI process. The active `railway.toml` builder is Dockerfile; Docker copies no frontend files and runs from `/app/backend`. Nixpacks and Procfile are alternate launch descriptions rather than the selected Railway builder.
- FastAPI talks directly to Anthropic or OpenRouter and to Supabase Auth/PostgREST. The browser talks directly to Supabase Auth with the anon key, then sends Supabase bearer tokens through Vercel to FastAPI. FastAPI validates those tokens with Supabase and uses the service-role key for user-scoped database operations.
- CORS remains configured for local/direct backend access and known Vercel domains, although the production rewrite path is same-origin at the browser boundary.

### Current Discrepancies and Missing Documentation

- `README.md` requires Node 18+, while the exact locked Supabase client requires Node 20+ and locked Vite/Rolldown/plugin packages require Node 20.19+ or Node 22.12+.
- `README.md` says Python 3.10+; Docker and Nixpacks select Python 3.11, and the checked-in local virtual environment metadata was generated with Python 3.14.2.
- The README's claimed `railway.toml` start command includes `cd backend`; the actual `railway.toml` command does not. The Dockerfile working directory already is `/app/backend`.
- The README tells Vercel deployments to set `VITE_API_URL` to Railway, but production frontend code ignores `VITE_API_URL` and always uses `/api`; both Vercel files hard-code the Railway destination.
- The README describes `.env.example` as the complete variable reference but does not enumerate the four `FALLBACK_ALERT_*` settings, `PORT`, Docker Python flags, or Nixpacks Python selector. `.env.example` does not include the supported `SUPABASE_KEY` alias.
- `.env.example` sets two OpenRouter fallback models, while absence of the variable activates a four-model code default; copying the example changes the effective fallback list.
- README API documentation says `POST /rewrite` returns `{ rewritten, source }`; the frontend validator requires `request_id`, and the backend also returns nullable `fallback_reason`.
- README deployment text identifies Anthropic as the AI provider and only briefly describes OpenRouter switching; the runtime provider is selected implicitly from base URL/key shape, and the OpenRouter multi-model retry behavior is not documented.
- README setup/deploy sections do not document root convenience scripts, frontend tests, backend test invocation, preview commands, the learning simulator, fallback alert behavior, production's fixed same-origin API behavior, or the coexistence/precedence of Dockerfile, Nixpacks, Procfile, and `railway.toml`.
- `frontend/README.md` remains generic Vite template documentation and does not describe PhraseAI's frontend setup, environment, scripts, Supabase auth, proxying, or deployment.
- `frontend/eslint.config.js` imports `@eslint/js`, `eslint/config`, `globals`, `eslint-plugin-react-hooks`, and `eslint-plugin-react-refresh`, but those packages are absent from `frontend/package.json` and its lockfile; no lint script is declared.
- `App.css` is present but not imported by `main.jsx` or `App.jsx`; its current active/legacy status is undocumented.
- The frontend enforces fixed 12,000/8,000-character draft/context limits independently of backend env overrides, so changing backend `MAX_DRAFT_CHARS` or `MAX_CONTEXT_CHARS` does not change browser limits.
- Integer/float parsing behavior is undocumented: four size limits fail application import on invalid values, fallback alert settings fail during outcome recording, and invalid `OPENROUTER_TIMEOUT_SECONDS` becomes a provider-path exception.
- The root and frontend Vercel configs are behaviorally duplicated, but documentation presents only the frontend-root layout.
- There is no Python transitive lock, Node package-manager/version pin, root lockfile, CI workflow, container health check, deployment health check, or documented command for running the full test/build set.
- Ignore rules cover secrets, dependencies, build output, virtual environments, caches, logs, editors, and Vercel state. Root `.gitignore` ignores only `backend/__pycache__` at that exact level plus all `*.pyc`; generated nested cache directories can remain untracked only because their bytecode files are ignored.

## SHARED MEMORY — Config & Dependencies

Config Reader confirms the Cartographer's monorepo and hosting map: Vite/React is deployed on Vercel, FastAPI on Railway, Supabase supplies browser auth and backend data/auth verification, and Anthropic/OpenRouter are backend-only provider paths. Production browser API traffic is not driven by `VITE_API_URL`; it is fixed to same-origin `/api` and forwarded by either Vercel config to the hard-coded Railway service.

The frontend dependency graph is reproducible through a 135-entry npm v3 lockfile, but its effective minimum Node version is 20.19 because of the current Vite toolchain, not the documented Node 18. Python has five pinned direct backend packages and no transitive lock. Backend runtime configuration is substantially broader than the README's deployment list, especially provider retry/fallback controls, input/profile limits, stress-test gating, and fallback-rate alert thresholds.

The canonical selected Railway path is Dockerfile because `railway.toml` declares `builder = "DOCKERFILE"`; Nixpacks and Procfile remain alternate deployment descriptions. Backend launchers converge on `app.main:app`, while frontend launch converges on `index.html` → `src/main.jsx` → `App.jsx`. Root npm scripts cover frontend dev/build/preview only; frontend tests and all backend execution/testing remain separate commands.

Material documentation drift is concentrated in runtime prerequisites, production API routing, the exact Railway command, the rewrite response contract, OpenRouter fallback defaults, lint availability, and missing operational command coverage. These findings extend the existing root shared memory without changing the source or deployment configuration.

## BACKEND READER — API & Business Logic

### Read Scope

- Read completely: `backend/app/main.py`, `backend/app/__init__.py`, `backend/scripts/simulate_learning.py`, `backend/tests/test_pipeline.py`, all three `backend/sql/*.sql` files, `backend/requirements.txt`, root `requirements.txt`, `.env.example`, `Dockerfile`, `backend/Procfile`, `nixpacks.toml`, `railway.toml`, root and frontend `vercel.json`, `frontend/vite.config.js`, root and frontend package manifests, `.dockerignore`, `.gitignore`, `README.md`, `AGENT_NOTES.md`, and `DEBUG_NOTES.md`.
- `backend/app/__init__.py` is empty and serves only as the package marker.
- Backend implementation is monolithic: every schema, dependency, provider adapter, rewrite helper, learning algorithm, persistence helper, route, and observability helper is in `backend/app/main.py`.
- Runtime dependencies are pinned to FastAPI `0.116.1`, Uvicorn `0.35.0`, python-dotenv `1.0.1`, Supabase `2.15.3`, and Anthropic `0.58.2`.

### Application and Middleware

- The FastAPI application identifies itself as `PhraseAI API`, version `0.2.0`.
- FastAPI's default OpenAPI surfaces remain enabled: `/docs`, `/redoc`, and `/openapi.json`.
- `load_dotenv()` runs at module import, so environment values are loaded before schemas and limits are defined.
- CORS origins start with comma-separated `FRONTEND_ORIGIN` values, then always include localhost and four hardcoded PhraseAI Vercel domains.
- A regex additionally permits PhraseAI preview deployments matching `https://phraseai-nico(?:-[a-z0-9-]+)?-nicotudor01s-projects.vercel.app`.
- CORS credentials are disabled. Allowed methods are `GET`, `POST`, and `OPTIONS`; allowed headers are `Authorization` and `Content-Type`.
- There is no custom HTTP middleware, global exception handler, request body logging, rate limiter, session middleware, or application lifespan hook.
- There is no background worker, scheduler, queue, task registry, webhook, streaming response, SSE path, or persistent job model. All route work completes inside the request lifecycle.
- [XREF: FRONTEND/DEPLOY] Local Vite and both Vercel configurations rewrite `/api/*` to unprefixed backend paths. The FastAPI routes themselves have no `/api` prefix.

### Request Models and Validation

- `RewriteRequest`: `draft` is required, 1 to `MAX_DRAFT_CHARS`, and rejected when whitespace-only; `mode` is exactly `more_professional`, `sound_smarter`, or `fix_grammar`; optional `context` is capped at `MAX_CONTEXT_CHARS`.
- `RewriteResponse`: required `rewritten` and `request_id`; `source` is `provider` or `fallback`; optional `fallback_reason` is one of `rate_limited`, `billing`, `authentication`, `model_unavailable`, `timeout`, or `provider_unavailable`.
- `ProfileRequest`: accepts a `profile` object only. Top-level keys are restricted to `stats`, `preferences`, `persona`, `guidance`, and `recent_examples`; serialized JSON is capped at `MAX_PROFILE_JSON_CHARS`. Nested shapes are otherwise unconstrained.
- `LearnRequest`: requires a valid rewrite `mode`, plus non-empty `draft`, `ai_output`, and `final_version`; draft uses `MAX_DRAFT_CHARS`, outputs use `MAX_FINAL_CHARS`. Unlike `RewriteRequest`, these three fields have no whitespace-only validator.
- `StressTestRequest`: `samples_per_phase` defaults to 15 and is bounded from 3 through 50.
- FastAPI/Pydantic provides standard `422` responses for invalid request bodies and invalid query parameter types.

### Authentication and Data Isolation

- Protected routes use `Depends(get_current_user)`, which reads the `Authorization` header and requires a non-empty `Bearer <token>` value.
- Missing or malformed headers return `401` with specific text details.
- The token is validated by `supabase.auth.get_user(token)`. That synchronous SDK call is sent through `asyncio.to_thread`.
- Supabase auth exceptions are reduced to `401 Invalid or expired auth token.` and logged as a privacy-safe `dependency.error` containing component, operation, and exception class.
- User responses may be SDK objects or dictionaries. The dependency extracts `id` and optional `email`; an unresolved ID returns `401`.
- The authenticated dependency returns `{"id": user_id, "email": email_or_empty_string}`.
- Backend database access uses `SUPABASE_SERVICE_ROLE_KEY`, with `SUPABASE_KEY` retained as a compatibility fallback. Missing URL/key returns `500`.
- Because service-role access bypasses RLS, all backend profile/event queries derive `user_id` from the verified token; no protected request body can choose a user ID.
- [XREF: DATABASE] SQL tables independently use UUID foreign keys to `auth.users(id)` with `ON DELETE CASCADE`, RLS, and ownership policies based on `auth.uid() = user_id`. These policies protect direct authenticated Supabase access but are bypassed by the backend service-role client.
- [XREF: DATABASE] `auth_hardening_migration.sql` transactionally disables RLS, deletes rows whose legacy user IDs do not match its UUID regex, casts both tables to UUID, restores foreign keys/policies, and commits.

### Endpoint Inventory

#### `GET /health`

- Public, synchronous route.
- No request body or query parameters.
- Returns HTTP `200` with `{"status": "ok"}`.
- Does not verify provider, Supabase, schema, or credentials; it reports process-level availability only.

#### `GET /`

- Public, synchronous route.
- Returns HTTP `200` with service name, `status: "ok"`, a backend/deployment message, and links to `/docs` and `/health`.

#### `GET /auth/me`

- Authenticated, asynchronous route.
- Returns HTTP `200` as `{"user": {"id": ..., "email": ...}}`.
- Its only business operation is bearer validation through Supabase Auth.

#### `GET /ai/model`

- Public, synchronous route exposing active provider selection, resolved model, local fallback enablement, and OpenRouter fallback model names.
- Provider is `openrouter` when `ANTHROPIC_BASE_URL` contains `openrouter.ai` or the API key begins `sk-or-`; otherwise it is `anthropic`.
- Returns `{"provider", "model", "fallback_enabled", "openrouter_fallback_models"}`.
- `fallback_enabled` defaults to true. OpenRouter fallback models are returned only when OpenRouter is selected.
- [XREF: FRONTEND] `App.jsx` fetches this endpoint without bearer authentication for model/status display.

#### `POST /rewrite`

- Authenticated, asynchronous route with `RewriteRequest`; successful and degraded responses are validated by `RewriteResponse`.
- Creates a 16-character request ID from a UUID4 hex string and measures total route latency.
- Resolves provider/model and output-token budget before loading personalization.
- Profile load selects only `profile` from `style_profiles` for the authenticated user. Storage failures are logged and converted to an empty profile, allowing rewrite to continue.
- Prompt construction receives only derived profile metadata: preferences, persona, up to six guidance strings, and learned-example count. Raw `recent_examples`, user ID, and email are excluded.
- Draft/context whitespace is normalized and length-bounded. Both are wrapped in XML-like tags with instructions that tagged content is untrusted data and cannot override system behavior.
- Prompt construction exceptions return `500` with structured detail: `{"message": "Could not prepare the rewrite.", "stage": "prompt", "request_id": ...}`.
- Provider calls are dispatched off the event loop with `asyncio.to_thread`.
- Anthropic uses the official client with temperature `0.4`, bounded timeout/retry configuration, a system message, and concatenation of text content blocks.
- OpenRouter uses synchronous `urllib.request` against `<base>/chat/completions`, OpenAI-style messages, temperature `0.4`, optional attribution headers, and a configurable timeout.
- OpenRouter normalizes an `/api` base to `/api/v1`; an already versioned base is retained.
- OpenRouter tries the preferred model followed by unique configured fallbacks. It advances only after statuses `429`, `500`, `502`, `503`, `504`, or `529`; other HTTP failures stop the chain.
- Empty/malformed provider output becomes `502`. OpenRouter timeout-like failures become `504`; other transport failures become `502`.
- Direct provider success returns HTTP `200` with `rewritten`, `source: "provider"`, `request_id`, and null/omitted-equivalent `fallback_reason`.
- Provider failures are classified by status/class into the six response categories.
- When local fallback is enabled, every provider exception is converted to HTTP `200` with deterministic text, `source: "fallback"`, request ID, and category.
- Deterministic fallback normalizes whitespace, capitalizes/terminates the sentence, expands a small set of abbreviations/contractions, and varies by mode. `more_professional` may normalize greeting, append a context sentence, and append `Thank you.`; `sound_smarter` may append context and always appends a clarity sentence; `fix_grammar` returns the normalized/replaced base.
- When local fallback is disabled, provider failures return `502` with structured detail identifying `stage: "provider"` and the request ID, regardless of the provider's original status.
- Auth/configuration failures occurring in the authentication dependency happen before the route's provider fallback boundary.
- [XREF: FRONTEND] The frontend validates `rewritten`, `source`, `request_id`, and fallback metadata before displaying a successful response.

#### `GET /profile/me`

- Authenticated, asynchronous route.
- Selects the current user's profile; a missing row produces an empty object.
- Returns `{"user_id": authenticated_id, "profile": profile}`.
- Storage errors return generic HTTP `500 Could not load the style profile.`.

#### `POST /profile/me`

- Authenticated, asynchronous route with `ProfileRequest`.
- Upserts `{"user_id", "profile", "updated_at"}` on conflict by `user_id`; ownership is always taken from the token.
- Returns `{"status": "ok", "user_id": ..., "profile": submitted_profile}`.
- Storage errors return generic HTTP `500 Could not save the style profile.`.
- [XREF: DATABASE] The table also has a `BEFORE UPDATE` trigger that replaces `updated_at` with database `now()`, so update timestamps ultimately come from the database on conflict updates.

#### `POST /learn`

- Authenticated, asynchronous route with `LearnRequest`.
- Loads the current profile, derives a new profile from `final_version`, upserts it, then records a learning event.
- Style signals include word count, sentence count, average sentence length, contraction ratio, exclamation/question counts, and simple greeting/sign-off presence.
- Preference aggregation uses exponential smoothing with `alpha = 0.3` for sentence length, contraction ratio, and exclamation count. Greeting and sign-off preferences are overwritten by the latest sample.
- Persona thresholds produce `formal`/`balanced`/`conversational`, `concise`/`balanced`/`detailed`, and `calm`/`warm`/`high`.
- Guidance is regenerated from current preferences rather than appended indefinitely.
- Profile stats increment `learned_examples`, record the latest mode, and store an ISO UTC learning timestamp.
- `recent_examples` prepends draft, AI, and final excerpts of up to 220 characters and retains at most 20 entries.
- Profile update is a read-modify-write sequence, not a transaction or compare-and-swap.
- Learning-event insertion stores the full draft, AI output, and final version, plus source, signals, and persona snapshot.
- Event insertion is best-effort: `log_learning_event` catches its own database errors, logs only exception class, and returns. Therefore `/learn` can return success after the profile is saved even when no event row was created.
- Returns `{"status": "ok", "user_id", "profile", "learned_examples"}`.
- Errors outside the internally swallowed event insert return generic HTTP `500 Could not save this learning update.`.
- [XREF: FRONTEND] `App.jsx` calls this endpoint when the user finalizes the edited rewrite.

#### `POST /dev/stress-test`

- Authenticated, asynchronous route with `StressTestRequest`.
- Also requires the exact lowercased environment value `"true"` for `ALLOW_DEV_STRESS_TEST`; other common truthy forms accepted by `env_flag` are not accepted here.
- Disabled access returns `403 Stress test endpoint is disabled.` after authentication and body validation.
- Builds two phases of deterministic samples: formal/concise, then warmer/conversational. Each phase contains `samples_per_phase` items generated by cycling three fixtures.
- Loads one profile, applies all samples in memory, attempts one event insert per sample, then performs one final profile upsert.
- Event inserts are sequential, offloaded one at a time, and individually best-effort.
- Returns `{"status": "ok", "user_id", "processed_samples": samples_per_phase * 2, "profile"}`.
- Other failures return generic HTTP `500 Could not complete the stress test.`.

#### `GET /learning-events/me`

- Authenticated, asynchronous route.
- Query parameter `limit` is an integer defaulting to 30, then clamped to 1 through 200.
- Selects `id,user_id,mode,source,final_version,signals,persona_snapshot,created_at`, filters by authenticated user, sorts newest first, and applies the safe limit.
- Does not return stored draft or AI output. It converts `final_version` to a newline-free 220-character `final_excerpt`.
- Returns `{"user_id": ..., "events": [...]}` where each event contains ID, mode, source, creation time, final excerpt, signals, and persona snapshot.
- Storage errors return generic HTTP `500 Could not load learning history.`.

### Provider and Rewrite Configuration

- Anthropic default model is hardcoded as `claude-sonnet-4-6`.
- The sole deprecated-model mapping upgrades `claude-sonnet-4-20250514` to `claude-sonnet-4-6` when using direct Anthropic.
- OpenRouter default model in code is `meta-llama/llama-3.1-8b-instruct:free`.
- Code-level OpenRouter fallback defaults are `meta-llama/llama-3.1-8b-instruct:free`, `qwen/qwen-2.5-7b-instruct:free`, `mistralai/mistral-7b-instruct:free`, and `openrouter/auto`; `.env.example` documents a shorter two-model value that overrides this list when copied.
- `LLM_MAX_TOKENS` defaults to 1200 and is clamped to 128 through 2400.
- Anthropic timeout defaults to 30 seconds and is clamped to 5 through 120; retries default to 2 and are clamped to 0 through 5. Invalid numeric strings fall back to defaults.
- OpenRouter timeout defaults to 25 seconds and is parsed directly inside the provider call; invalid numeric text enters the general provider-failure path.
- Import-time character limits default to draft 12000, context 8000, final output 12000, and profile JSON 24000. Invalid values prevent module import.
- `ENABLE_LOCAL_REWRITE_FALLBACK` accepts `1`, `true`, `yes`, or `on` and defaults true.

### Persistence and SQL

- `style_profiles` has one row per auth user: UUID primary key, JSONB profile, and timestamp. The update trigger refreshes `updated_at`.
- `learning_events` has a bigserial ID and stores full learning content, source, derived signals, persona snapshot, and creation time.
- Learning history has an index on `(user_id, created_at desc)`.
- Both schema files enable RLS and recreate select/insert/update/delete ownership policies.
- The backend explicitly writes `updated_at` during profile upserts even though the database trigger handles updates.
- No SQL function/RPC, database transaction wrapper, migration runner, ORM model, connection pool configuration, or schema-version table exists in the repository.

### Async and Concurrency Behavior

- Route functions that touch auth, providers, or storage are async, but the Supabase and provider libraries used here are synchronous.
- `run_blocking_io` delegates those calls to Python's default `asyncio` thread pool.
- `/rewrite` performs profile load then provider call sequentially.
- `/learn` performs profile read, CPU-local aggregation, profile write, then event insert sequentially.
- `/dev/stress-test` performs all event writes sequentially and only writes the final profile after processing the complete sample set.
- The in-process fallback monitor uses a `deque` guarded by a `threading.Lock`; its window and alert state are process-local and not shared across Uvicorn workers or deployments.
- Concurrent `/learn` requests for one user can each read the same starting profile and overwrite one another's aggregate result.

### Errors and Response Shapes

- Authentication errors preserve `401`; stress-test disablement preserves `403`; request validation uses `422`.
- Storage failures are generally normalized to route-specific string-detail `500` responses while logs retain only exception class.
- Prompt and provider terminal failures use dictionary-valued `detail` containing a safe message, stage, and request ID.
- Profile load failure during rewrite is non-terminal and silently changes behavior to an unpersonalized rewrite, with a structured dependency log.
- Provider failure with enabled fallback is represented as degraded HTTP `200`, not a non-2xx response.
- Provider error classification treats status `400`, `404`, and `422` as `model_unavailable`; `401`/`403` as authentication; `402` as billing; `429` as rate limited; `408`/`504` or timeout class names as timeout; everything else as provider unavailable.
- `provider_error_status(TimeoutError())` yields 502 because the exception has no status, while classification still yields `timeout` from the class name.

### Logging and Monitoring

- The named logger is `phraseai.api`; the repository does not configure handlers, levels, or formatters itself.
- `log_event` serializes sorted JSON at INFO level.
- Structured rewrite success logs include request ID, provider, model, estimated prompt tokens, max output tokens, latency, source, and status.
- Degraded rewrite logs additionally include provider HTTP status, fallback category, and exception class.
- Provider fallback also emits a WARNING line with provider, model, status, category, and exception class.
- Logged fields deliberately exclude prompt, draft, context, output, email, user ID, token, provider response body, and exception message.
- Fallback-rate monitoring defaults to a 300-second rolling window, 10-request minimum, 25% threshold, and 300-second alert cooldown. It records only completed provider/fallback rewrite outcomes; prompt/auth failures do not enter the window.
- Alert configuration is read on every recorded outcome and parsed without fallback handling; invalid numeric values can raise after a rewrite provider result has already been obtained.
- Learning-event insert failures and generic storage failures are warning logs containing exception class only.

### Utility Script

- `backend/scripts/simulate_learning.py` is a local, synchronous, non-database simulator for `update_profile_from_feedback`.
- It requires a JSON fixture path with `phaseA` and `phaseB` arrays, tolerates an outer Markdown `json` fence, validates each item through `LearnRequest`, runs both phases, and prints stats/preferences/persona/guidance plus retained-example count.
- It neither authenticates nor calls FastAPI, providers, or Supabase.

### Tests and Validation

- `backend/tests/test_pipeline.py` uses `unittest` and `IsolatedAsyncioTestCase`; it imports the backend by adding `backend/` to `sys.path`.
- Pure/helper coverage verifies provider category mapping, fallback status extraction, environment-flag parsing, deprecated Anthropic model replacement, prompt exclusion of raw history/user identity, derived-only profile prompt context, and one learning update.
- Route-level direct-call coverage mocks profile/provider helpers and verifies billing, rate-limit, timeout, authentication fallback categories, typed prompt-stage failure, and whitespace-only rewrite rejection.
- OpenRouter unit coverage verifies timeout maps to `504` and an empty `choices` response maps to `502`.
- Tests call `rewrite_email` directly with a fabricated current-user dictionary; they do not exercise ASGI routing, dependency injection, Authorization parsing, Supabase token validation, CORS, OpenAPI response serialization, or real HTTP response bodies.
- There is no backend test coverage for `/health`, `/`, `/auth/me`, `/ai/model`, either profile route, `/learn` persistence, `/dev/stress-test`, `/learning-events/me`, SQL/RLS, deterministic fallback text, Anthropic response parsing, OpenRouter retry ordering, fallback-rate alerts, or deployment startup commands.
- Validation run on June 10, 2026: all 13 backend tests passed.
- Validation run on June 10, 2026: `py_compile` passed for `backend/app/main.py` and `backend/scripts/simulate_learning.py`.

### Deployment Runtime

- Docker uses `python:3.11-slim`, installs only backend requirements, copies `backend/`, changes to `/app/backend`, and starts Uvicorn on `${PORT:-8000}`.
- `backend/Procfile` declares the same Uvicorn module and default port.
- Nixpacks selects Python 3.11, installs `backend/requirements.txt`, then changes into `backend` before starting Uvicorn with `${PORT}`.
- Railway is configured for Dockerfile builds, but its explicit `startCommand` runs `uvicorn app.main:app` without changing into `backend`; the Docker image's final working directory is already `/app/backend`.
- Railway restart policy is `ON_FAILURE` with at most 10 retries.
- No Uvicorn worker count, proxy-header option, access-log option, reload mode, or graceful-timeout override is configured.
- Root `requirements.txt` is only `-r backend/requirements.txt`, supporting root-level Python installers.
- [XREF: FRONTEND/DEPLOY] Root and frontend Vercel configs both proxy same-origin `/api/(.*)` to `https://phraseai-production.up.railway.app/$1`.

## SHARED MEMORY — Backend

PhraseAI's backend is a single FastAPI 0.2.0 module with ten explicit route operations: three public routes (`/`, `/health`, and `/ai/model`) and seven authenticated operations (`/auth/me`, `/rewrite`, both `/profile/me` methods, `/learn`, `/dev/stress-test`, and `/learning-events/me`). FastAPI also supplies its default documentation/OpenAPI surfaces. Supabase Auth validates bearer tokens; the resulting UUID is the exclusive ownership key for service-role database operations. Profiles are one JSONB row per user, while learning events retain full draft/AI/final content and derived snapshots.

The rewrite path loads personalization best-effort, builds a bounded injection-aware prompt from derived style metadata, and dispatches a synchronous Anthropic or OpenRouter call through `asyncio.to_thread`. OpenRouter supports transient-status model fallback. Provider success and deterministic fallback both return HTTP 200 under one typed response model; degraded responses carry a request ID and operational category. Authentication occurs before that fallback boundary, and profile-storage failure degrades to an empty profile.

Learning is deterministic aggregate metadata, not a provider job: the final user edit updates exponentially smoothed preferences, categorical persona, regenerated guidance, statistics, and a 20-entry excerpt history. `/learn` writes the profile before attempting a best-effort event insert. Its profile mutation is a non-atomic read-modify-write. History returns sanitized final excerpts and derived metadata, not stored drafts or AI output. The stress endpoint reuses the same algorithm with hardcoded two-phase fixtures and is gated by an exact `ALLOW_DEV_STRESS_TEST=true`.

All synchronous auth, database, and provider calls are offloaded to the default thread pool, but operations within each request remain sequential. There are no queues, background jobs, schedulers, streaming responses, or cross-process monitoring state. Privacy-safe logs identify request stage, provider/model, latency, token estimate, fallback category, and exception class without logging content or identity. The in-memory fallback-rate alert is per process.

[XREF: DATABASE] SQL enforces UUID ownership and RLS for direct Supabase access, while the backend's service-role key bypasses those policies and relies on verified server-side query scoping. [XREF: FRONTEND] Browser traffic normally reaches these unprefixed routes through a same-origin `/api` proxy. [XREF: TEST] The current 13-test backend suite passes and concentrates on rewrite/provider helpers and direct rewrite route calls; it does not perform full authenticated ASGI/database integration.

## FRONTEND READER — UI & Components

### Runtime Hierarchy and Component Shape

- `frontend/index.html` is a minimal English-language Vite shell with only the viewport/meta title, `#root`, and `/src/main.jsx`; it does not link a favicon, preload fonts, or provide static fallback content.
- `frontend/src/main.jsx` imports only `index.css` and `App.jsx`, then mounts `<App />` under React `StrictMode`. `App.css` is not imported anywhere.
- `App.jsx` is the entire runtime component tree. The only extracted React components are stateless inline SVG/control primitives: `HomeIcon`, `HistoryIcon`, `ProfileIcon`, `SettingsIcon`, `SparkleIcon`, `ArrowIcon`, `CopyIcon`, `CheckIcon`, `ThemeIcon`, and `BrandLogoIcon`.
- The top-level render has three mutually exclusive UI phases:
  1. auth bootstrap: a full-page `Loading session...` message;
  2. unauthenticated or password-recovery: two-pane auth/product-story page;
  3. authenticated: fixed application shell with sidebar/bottom navigation, header, and one active content section.
- Authenticated content is split into nested render functions rather than separate modules: `renderHome`, `renderHistory`, `renderSettings`, `renderStyleProfile`, and `renderAccount`.
- There is no URL router, route table, deep linking, browser-history integration, or persisted active section. `activeSection` begins at `home` on every mount and buttons switch views in memory.

### State and Derived State

- `App` owns 30 `useState` values: draft text, context text/visibility, rewrite mode, editable rewritten text, immutable learning baseline (`lastAiOutput`), rewrite source, active section, theme, rewrite/learning/stress loading flags, rewrite/learning/stress messages, profile, learning events, copy status, Supabase session/auth readiness/mode/recovery state, email/password, auth/reset busy flags, auth error/success message, AI model info, and the latest developer diagnostic.
- A `Map` in `loginAttemptsRef` tracks failed credential attempts per normalized email for the lifetime of the mounted page. It is not persisted or shared across tabs/devices.
- Derived values include account display/initials, theme tokens, selected mode label, section booleans, draft/output/finalization readiness, and current section heading metadata.
- Theme defaults to dark, reads `phraseai-theme` from `localStorage` once, writes every theme change back, and ignores storage exceptions. Both auth and app shells expose theme colors through CSS custom properties and `data-theme`.
- Session-token changes clear profile/history when absent and trigger parallel profile/history reads when present. Failed reads silently collapse to `{}` and `[]`, so unavailable data and genuinely empty data share the same UI.

### Authentication UI and Email Input

- Supabase is instantiated only when both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` exist. Missing configuration resolves bootstrap into the login page with an explicit configuration error.
- Bootstrap calls `supabase.auth.getSession()`, optionally signs out an existing session when `VITE_FORCE_LOGIN_ON_VISIT=true`, and subscribes to `onAuthStateChange`. `PASSWORD_RECOVERY` switches the form into a dedicated new-password state.
- The same form handles sign-in, sign-up, and password update. Sign-in/sign-up collect native `type="email"` and password fields; recovery hides email and updates the current user password. Passwords have `required`, `minLength=8`, and mode-specific autocomplete.
- Email is displayed as entered to Supabase; normalization (`trim().toLowerCase()`) is used only as the client-side login-attempt map key. Forgot-password trims the email and redirects recovery to `window.location.origin`.
- Sign-in limits five counted `Invalid login credentials` failures per normalized email in a 15-minute in-memory window. Other Supabase errors are surfaced but do not increment that counter. Successful sign-in and password-reset request clear the email's local counter.
- Auth busy states disable only their corresponding submit/reset controls and change labels to `Working...` or `Sending...`; auth messages occupy a live-region slot. Sign-up success tells the user to check email confirmation if required.
- Auth product framing includes the writing promise, three benefit claims, a decorative refined-email preview, model-provider connection text when available, a privacy claim, theme toggle, support mail link, and sign-in/create-account switch.
- Sign-out is available in both header and Account. It calls Supabase sign-out and clears draft, output, baseline, context, rewrite/learning messages, and source, but does not explicitly reset mode, active section, profile/history, auth credentials, copy status, or diagnostics; profile/history later clear when the session effect observes no token.
- // CROSS-REFERENCE: [AUTH/SECURITY READER] Supabase owns browser session persistence and recovery events; the frontend sends bearer access tokens to the backend and performs a single refresh-and-retry after a `401`.

### Main Journey: Draft, Rewrite, Edit, Finalize

- Home is a two-panel composer. The left panel contains the original draft, three rewrite modes (`more_professional`, `sound_smarter`, `fix_grammar`), optional context, and rewrite action. The right panel contains the editable rewrite, copy action, and learning/finalization action.
- Draft and context limits are enforced in the browser at 12,000 and 8,000 characters. The UI shows live character counts; draft/output also show a whitespace-derived word count.
- `Use example` inserts a fixed follow-up email and selects Professional. Once any draft exists, the same control becomes `Clear` and clears draft, rewritten text, and learning baseline, while leaving context, mode, prior messages, source, and diagnostics intact.
- Rewrite is enabled by non-whitespace draft and can run by button or `Cmd/Ctrl+Enter`. The request sends `{ draft, mode, context: trimmedContext || null }`.
- A successful response is accepted only if `rewriteResponse.js` finds nonblank `rewritten`, source exactly `provider` or `fallback`, and a nonblank string `request_id`. The returned text fills both editable `rewritten` and immutable `lastAiOutput`.
- The user can edit `rewritten` after generation. Finalization sends `{ mode, draft, ai_output: lastAiOutput, final_version: rewritten }`, updates the returned profile, triggers a history refresh, and reports that future rewrites will adapt.
- Finalization requires both editable output and a generated baseline. It does not require the final version to differ from the AI output, and it uses the current `mode` and `draft`, which remain editable after the baseline was generated.
- Copy writes the current editable output through `navigator.clipboard`, changes the label to `Copied` for 1.2 seconds, and has no explicit clipboard-error state.
- // CROSS-REFERENCE: [BACKEND READER] Frontend contract assumptions cover `/rewrite`, `/learn`, `/profile/me`, `/learning-events/me?limit=25`, `/ai/model`, and development-only `/dev/stress-test`; backend response schemas and authorization should be compared against these exact payload/read expectations.

### Loading, Error, Warning, Success, and Empty States

- Auth bootstrap has a dedicated full-page loading state. Auth submit and reset have independent busy labels/spinners, and missing Supabase/auth transport/session errors render on the auth form.
- Rewrite loading disables the original rewrite button and rewritten textarea, changes the action label, applies a loading class, and overlays four animated skeleton lines in the output editor.
- The initial output empty state is a centered sparkle, heading, and explanation. The textarea remains mounted behind it. Output actions are disabled until nonblank output exists.
- Rewrite failures are classified by `ApiRequestError` stages (`auth_setup`, `session`, `timeout`, `transport`, `response`, or backend-provided stage) and stable status-based messages. A second `401` after token refresh is surfaced as session expiration, but the frontend does not itself sign out in that path.
- Backend fallbacks are successful outputs with `source=fallback`; the UI shows a `Local fallback` badge plus a yellow warning specialized for rate limiting, billing, authentication, unavailable model, timeout, or provider availability. Provider output shows `AI rewrite`.
- Development builds expose the full latest rewrite diagnostic in a `<details>` block, including stage, status, source, fallback reason, and request ID.
- Learning has its own spinner/message area. Before any message, a persistent hint explains that edited approved output is learned. Message styling treats text containing `saved` as success and all other learning messages as error.
- History shows either up to the backend-returned 25 events or an empty card instructing the user to finalize a rewrite. Entries show normalized mode text, localized date, source, and final excerpt; there is no per-entry open, restore, delete, pagination, or loading indicator.
- Style Profile always renders numeric/stat cards with zero/unknown defaults. Guidance has a dedicated empty prompt. Trait chips are absent when there are no traits. Failed profile reads are visually indistinguishable from a new profile.
- In development, Style Profile adds a 30-sample stress-test control, busy text, and success/error text; its request sends `samples_per_phase: 15`, while the button label describes 30 total samples.
- Settings has no empty/loading state because it is entirely local. Account reads directly from the active Supabase session and uses `Unknown`, `Not set`, or `Unavailable` fallbacks.
- `/ai/model` is fetched without authentication on mount; failure is intentionally silent. When present it drives provider/model status in auth preview and app header. When absent, the auth preview says `AI workspace` and the authenticated header omits model status.

### API and Supabase Integration

- Development uses `VITE_API_URL` or `/api`; production always uses same-origin `/api`. Vite proxies local `/api` to `http://localhost:8000` and strips the prefix. Frontend Vercel rewrites `/api/(.*)` to the Railway backend.
- `apiFetch` re-reads the latest Supabase session before every authenticated API call, sends JSON content type plus bearer token, uses a 65-second `AbortController` timeout, and retries once after `401` via `refreshSession`.
- Responses are read as text first, conditionally JSON-parsed, and converted to typed UI errors. A non-JSON success is a response error; a non-JSON failure falls through to status/generic messaging.
- Error extraction supports string `detail`, object `detail`, or top-level problem objects. `401` and `422` receive fixed frontend copy; other backend string details can be shown directly.
- Profile and history reads are resilient/silent; rewrite, learn, stress test, and auth actions expose their failures. No direct Supabase database/table queries occur in the frontend: Supabase is used for Auth, while application data travels through FastAPI.
- // CROSS-REFERENCE: [DEPLOYMENT READER] Production ignores `VITE_API_URL` by design and depends on the Vercel same-origin rewrite; local development depends on Vite's prefix-stripping proxy.

### Navigation, Layout, and UI Patterns

- Desktop uses a 228px fixed sidebar, section header, scrollable content region, and side-by-side composer panels. Sidebar navigation covers Home, History, Style Profile, Settings, and Account; header also provides theme and sign-out.
- At 1040px the composer stacks vertically. At 760px the sidebar becomes a fixed bottom navigation, descriptive labels disappear, the app reserves bottom space, header metadata/model/sign-out hide, and composer spacing shrinks. At 420px copy becomes icon-only.
- Auth becomes single-column below 760px with the form before the product story. At 420px the text brand hides and benefit rows stack.
- Accessibility hooks include semantic labels, `aria-current`, `aria-pressed`, `aria-expanded`, `aria-busy`, live regions, focus-visible outlines, reduced-motion handling, and hidden decorative SVGs. The output empty illustration is explicitly `aria-hidden`; generating output has an `aria-label`.
- Visual language is a dark/light token system with compact 7–8px radii, translucent panels, green accent/actions, subtle borders, inline SVG icons, skeleton shimmer, and Tailwind utility classes mixed with authored CSS and inline theme styles.
- `index.css` is the active stylesheet and contains Tailwind directives plus all auth/shell/composer responsive rules. `App.css` is an unimported nested-CSS Vite starter stylesheet whose selectors (`counter`, `hero`, `center`, `next-steps`, etc.) have no runtime counterparts.
- Several CSS selectors in `index.css` reflect older markup names (`auth-mode-switch`, `auth-mode-button`, `auth-message`, `text-action`, `composer-controls`, `app-header-copy`, `auth-lede`) while current JSX uses nearby but different structures/classes.

### Frontend Config, Dependencies, Tests, and Assets

- The manifest exposes only `dev`, `build`, `preview`, and Node's native `test` script. Runtime dependencies are React, React DOM, and Supabase; tooling is Vite, React plugin, Tailwind 3, PostCSS, and Autoprefixer.
- The complete lockfile is lockfile v3 with 135 `node_modules` package entries. It resolves React/React DOM 19.2.6, Supabase 2.108.0, Vite 8.0.14, React plugin 6.0.2, Tailwind 3.4.19, PostCSS 8.5.15, and Autoprefixer 10.5.0. Vite/plugin packages require Node `^20.19.0 || >=22.12.0`; Supabase packages require Node 20+.
- ESLint uses browser globals plus recommended JavaScript, hooks, and Vite refresh rules, ignoring `dist`. Tailwind scans `index.html` and `src/**/*` and adds one `glow` shadow utility. PostCSS enables Tailwind and Autoprefixer.
- The only frontend test file exercises `validateRewriteResponse`: complete provider and fallback payloads pass; empty rewrite, unknown source, missing data, and blank request ID fail. There are no component, auth, navigation, state-transition, accessibility, or browser tests in `frontend/tests`.
- The frontend README remains generic React/Vite template documentation and does not describe PhraseAI behavior or frontend environment variables.
- `hero.png` is a 343x361 transparent stacked-layer illustration. `react.svg`, `vite.svg`, and `favicon.svg` contain standard React/Vite template artwork; `icons.svg` is a Vite-template social/documentation symbol sheet. The three 1600x900 `story-*.svg` files are abstract dark blue product-story illustrations.
- No frontend source, HTML, or CSS references `hero.png`, any `src/assets/*.svg`, `public/icons.svg`, `public/favicon.svg`, or the three story illustrations. The runtime brand and controls are drawn directly in JSX.
- The frontend test command could not be executed in this agent environment because `node` and `npm` were not available on `PATH`; file-level test coverage was read completely.
- // CROSS-REFERENCE: [TEST READER] Frontend automated coverage is isolated to response-contract validation; all UI state and Supabase/API journeys are currently outside the frontend test suite.

## SHARED MEMORY — Frontend

PhraseAI's frontend is a single-component React 19 SPA with no URL routing. `App.jsx` owns the full auth gate, all 30 state values, the five authenticated sections, Supabase Auth lifecycle, API wrapper, rewrite workflow, learning workflow, and developer diagnostics. The user journey is sign in/sign up/recover, enter an email draft, choose Professional/Sharper/Grammar, optionally add context, generate a provider or local-fallback rewrite, edit the result, copy it, and approve it as a learning signal. Approval preserves the original AI output separately from the editable final text, then refreshes style profile and history.

The browser uses Supabase only for authentication. Every application-data call goes to FastAPI with a bearer token, a 65-second timeout, and one refresh retry after `401`. Production is hard-wired to same-origin `/api`; local Vite strips `/api` and proxies to port 8000. Profile/history failures silently appear as empty data, while rewrite/learn/auth actions expose stable UI messages. Fallback rewrites remain usable and are visibly labeled with categorized provider warnings.

The active UI is styled by `index.css`, which combines Tailwind utilities, CSS variables, inline token styles, authored responsive CSS, and accessible interaction states. Desktop has a sidebar and dual-panel composer; mobile turns navigation into a fixed bottom bar and stacks the workflow. `App.css` and every repository image/SVG asset are unreferenced template or unused artwork; visible icons and branding are inline JSX. Frontend automated tests cover only rewrite-response shape validation, and the generic frontend README does not document the product UI.

## DATA READER — Schema & Data Flow

### SQL Inventory and Execution Order

- `backend/sql/auth_hardening_migration.sql` is a transactional migration for an existing deployment whose `user_id` columns were text. The README instructs operators with that legacy state to run it before the current table scripts.
- `backend/sql/style_profiles.sql` declares the current profile table, timestamp function/trigger, RLS enablement, and four ownership policies.
- `backend/sql/learning_events.sql` declares the current event table, one composite index, RLS enablement, and four ownership policies.
- These are the only SQL files in the repository; all three were read completely.
- The SQL files contain no `GRANT` or `REVOKE` statements. Effective table/function privileges therefore depend on privileges already present in the Supabase project rather than repository-declared grants. The Cartographer file-map descriptions that mention grants do not match the checked-in SQL.

### Table: `public.style_profiles`

| Column | Type | Nullability | Default | Constraints / usage |
|---|---|---|---|---|
| `user_id` | `uuid` | implicit `NOT NULL` through primary key | none | Primary key; FK to `auth.users(id)` with `ON DELETE CASCADE`; one row at most per auth user; backend upsert conflict target |
| `profile` | `jsonb` | `NOT NULL` | `'{}'::jsonb` | Stores the complete learned profile document |
| `updated_at` | `timestamptz` | `NOT NULL` | `now()` | Explicitly supplied by backend upserts; also overwritten by the update trigger |

- Primary-key index on `user_id` is implicit. No additional index is declared.
- `public.set_style_profiles_updated_at()` is a `plpgsql` trigger function, `SECURITY INVOKER`, with `search_path = public`; it assigns `new.updated_at = now()` and returns `new`.
- Trigger `style_profiles_set_updated_at` runs `BEFORE UPDATE` for every row. On an upsert that resolves to update, its timestamp supersedes the backend-supplied ISO timestamp.
- Stored `profile` shape produced by learning:
  - `stats`: `learned_examples`, `last_mode`, `last_learned_at`.
  - `preferences`: rolling `avg_sentence_length`, `contraction_ratio`, `avg_exclamation_count`, plus latest `prefers_greeting` and `prefers_signoff`.
  - `persona`: `formality`, `directness`, `energy`, `traits`.
  - `guidance`: generated strings used in later rewrite prompts.
  - `recent_examples`: newest-first, maximum 20 entries containing `learned_at`, `mode`, and up-to-220-character draft/AI/final excerpts.
- `POST /profile/me` accepts only top-level keys `stats`, `preferences`, `persona`, `guidance`, and `recent_examples`, and caps serialized JSON at `MAX_PROFILE_JSON_CHARS` (default 24,000). It does not validate nested field types/shapes. The frontend has no call path to this endpoint.

### Table: `public.learning_events`

| Column | Type | Nullability | Default | Constraints / usage |
|---|---|---|---|---|
| `id` | `bigserial` | implicit `NOT NULL` through primary key | sequence-backed | Primary key |
| `user_id` | `uuid` | `NOT NULL` | none | FK to `auth.users(id)` with `ON DELETE CASCADE`; supplied from verified bearer identity |
| `mode` | `text` | `NOT NULL` | none | API restricts normal writes to three modes; DB has no check constraint |
| `source` | `text` | `NOT NULL` | `'manual'` | Runtime writes `manual` or `stress_test`; DB has no check constraint |
| `draft` | `text` | `NOT NULL` | none | Full original draft |
| `ai_output` | `text` | `NOT NULL` | none | Full provider/fallback result used as learning baseline |
| `final_version` | `text` | `NOT NULL` | none | Full user-approved/edited version |
| `signals` | `jsonb` | `NOT NULL` | `'{}'::jsonb` | Word/sentence counts, average sentence length, contraction ratio, punctuation counts, greeting/sign-off flags |
| `persona_snapshot` | `jsonb` | `NOT NULL` | `'{}'::jsonb` | Persona after applying the event |
| `created_at` | `timestamptz` | `NOT NULL` | `now()` | History ordering timestamp |

- Index `learning_events_user_created_idx` covers `(user_id, created_at DESC)` and matches the history query's equality filter and descending order.
- There are no uniqueness/idempotency constraints for a finalized rewrite, no database checks for allowed modes/sources, and no database length bounds on stored email text or JSON.
- Full drafts, AI outputs, and final versions remain stored. The history API does not return the draft or AI output and reduces the final version to a 220-character single-line excerpt.

### Foreign Keys and Delete Behavior

- Both public tables reference `auth.users(id)` and cascade deletes when the Supabase Auth user is deleted.
- The migration drops and recreates the expected FK names `learning_events_user_id_fkey` and `style_profiles_user_id_fkey`.
- No FK links `learning_events` to `style_profiles`; their relationship is only shared `user_id`.

### RLS and Policies

- RLS is enabled on both public tables by their current schema scripts.
- Each table has four named policies; `CREATE POLICY` defaults make them permissive and applicable to `PUBLIC` because no `TO` role is stated.
- `learning_events_select_own`: `FOR SELECT USING (auth.uid() = user_id)`.
- `learning_events_insert_own`: `FOR INSERT WITH CHECK (auth.uid() = user_id)`.
- `learning_events_update_own`: `FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)`.
- `learning_events_delete_own`: `FOR DELETE USING (auth.uid() = user_id)`.
- `style_profiles_select_own`: `FOR SELECT USING (auth.uid() = user_id)`.
- `style_profiles_insert_own`: `FOR INSERT WITH CHECK (auth.uid() = user_id)`.
- `style_profiles_update_own`: `FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)`.
- `style_profiles_delete_own`: `FOR DELETE USING (auth.uid() = user_id)`.
- The legacy migration disables RLS on both tables inside one transaction, deletes rows whose text `user_id` does not match its UUID regex, casts both columns to `uuid`, recreates FKs, re-enables RLS, recreates all eight policies, and commits. Its later `ALTER TABLE` statements are not `IF EXISTS`, so both legacy tables must exist. It does not create the current index, profile timestamp trigger/function, tables, or grants.
- Runtime public-table operations do not exercise these policies: the backend requires `SUPABASE_SERVICE_ROLE_KEY` (or legacy `SUPABASE_KEY`) and the service role bypasses RLS. Isolation at runtime is implemented by deriving `user_id` from `supabase.auth.get_user(token)` and adding that verified ID to every query/write. The frontend anon client performs Auth calls only and never calls `.from()`/`.table()` for either public table.

### Supabase Clients and Access Boundary

- Frontend: one `@supabase/supabase-js` client is created from `VITE_SUPABASE_URL` plus `VITE_SUPABASE_ANON_KEY`. It manages sessions and Auth directly.
- Backend: `get_supabase()` creates a Python Supabase client from `SUPABASE_URL` plus service-role credentials for every auth dependency/helper/route invocation. There is no shared cached client.
- Every protected API call parses `Authorization: Bearer <token>`, validates it through `supabase.auth.get_user(token)`, and retains only resolved `id` and `email`; storage ownership uses the resolved `id`.
- Frontend `apiFetch()` calls `supabase.auth.getSession()`, sends the access token to FastAPI, and on one backend `401` calls `refreshSession()` and retries once.
- No frontend code directly reads or writes `style_profiles` or `learning_events`; no backend code uses an end-user JWT for PostgREST table access.

### Complete Frontend Supabase Auth Paths

- Bootstrap: `getSession()` restores a persisted session. Optional `VITE_FORCE_LOGIN_ON_VISIT=true` immediately calls `signOut()` and clears it.
- Listener: `onAuthStateChange()` replaces React session state for all auth events; `PASSWORD_RECOVERY` also switches the UI to recovery mode.
- Signup: `signUp({ email, password })` creates the Supabase Auth account. No user metadata is supplied and no public profile row is created at signup.
- Sign-in: `signInWithPassword({ email, password })`; the in-memory per-email attempt counter is frontend-only and resets on page reload.
- Recovery request: `resetPasswordForEmail(email, { redirectTo: window.location.origin })`.
- Recovery completion: `updateUser({ password })`.
- Request authentication: `getSession()` before each API call and `refreshSession()` after the first API `401`.
- Sign-out: `signOut()`, followed by local composer-state clearing; the auth listener clears the session, and the session effect clears profile/history state.
- Account display reads `session.user.email`, `created_at`, `id`, and optional `user_metadata.full_name`/`name`; the application does not write those metadata fields.

### Backend Data Queries and Writes

| Path / helper | Operation | Query or payload | Consumer |
|---|---|---|---|
| `get_current_user` | Auth read | `supabase.auth.get_user(token)` | Dependency for every protected route |
| `get_profile_for_user` | Profile read | `style_profiles.select("profile").eq("user_id", verified_id)` | Rewrite, profile GET, learn, stress test |
| `GET /profile/me` | Profile read | Calls profile helper; missing row becomes `{}` | Initial frontend profile load |
| `POST /profile/me` | Profile insert/update | Upsert `{user_id, profile, updated_at}` on conflict `user_id` | API exists; no frontend caller |
| `POST /rewrite` | Profile read only | Loads profile; storage failure degrades to `{}` | Style metadata/guidance in provider prompt or deterministic fallback |
| `POST /learn` | Profile read then insert/update | Reads current JSON, computes next JSON, upserts entire row | Finalization/style learning |
| `log_learning_event` | Event insert | Inserts verified `user_id`, mode, full texts, source, signals, persona snapshot | Manual learn and stress-test paths |
| `POST /dev/stress-test` | Profile read, repeated event inserts, profile insert/update | Inserts `2 * samples_per_phase` synthetic events, then upserts final aggregate profile | Development UI and external callers when enabled |
| `GET /learning-events/me` | Event read | Selects `id,user_id,mode,source,final_version,signals,persona_snapshot,created_at`, filters verified `user_id`, orders `created_at DESC`, limits 1–200 | Initial frontend history load and refresh after learn/stress |

- The history query selects `user_id` but does not include it in returned event objects.
- Returned event fields are `id`, `mode`, `source`, `created_at`, `final_excerpt`, `signals`, and `persona_snapshot`. The current History UI displays only mode, created time, source, and final excerpt.
- `GET /auth/me` validates and echoes the backend's reduced user object but has no frontend caller.
- There are no update or delete data routes. SQL update/delete RLS policies are present but direct user CRUD paths do not currently use them.

### End-to-End Lifecycle

1. Signup creates only an `auth.users` identity through the frontend anon client. Email confirmation behavior is delegated to Supabase project configuration.
2. An auth-state event or later password sign-in establishes a browser session. The access-token effect concurrently requests `GET /profile/me` and `GET /learning-events/me?limit=25`.
3. For a new user, no `style_profiles` row exists; the backend profile helper returns `{}`. History is empty because no learning event exists.
4. Rewrite sends `{draft, mode, context}` to `POST /rewrite`. FastAPI validates the bearer token with Supabase Auth, reads the user's profile through service-role PostgREST, removes `recent_examples` from prompt context, and uses derived preferences/persona/guidance plus learned-example count. Rewrite itself writes no database row.
5. The frontend stores the returned rewrite twice in memory: editable `rewritten` and immutable-baseline `lastAiOutput`. User edits change only `rewritten`.
6. Finalization sends `{mode, draft, ai_output: lastAiOutput, final_version: rewritten}` to `POST /learn`.
7. The backend rereads the complete profile, calculates signals from `final_version`, increments/updates aggregate profile fields, prepends a bounded excerpt history item, and upserts the whole `style_profiles` row.
8. It then attempts to insert the full learning event with source `manual`. Event-insert exceptions are caught inside `log_learning_event`, logged by exception class, and not propagated, so finalization can return success with an updated profile but no history row.
9. The frontend replaces local profile state from the learn response and starts an unawaited history reload. History reflects `learning_events`, not `profile.recent_examples`.
10. Later rewrites load the updated profile. Only derived style fields and guidance enter the LLM prompt; raw recent excerpts stay in storage.
11. Auth-user deletion cascades to both the profile and all learning events.

### Stress-Test Flow

- The development-only frontend button posts `{samples_per_phase: 15}`; the endpoint requires `ALLOW_DEV_STRESS_TEST=true`.
- The backend generates a formal phase and conversational phase, totaling 30 samples at the frontend's fixed value.
- It reads the profile once, mutates the in-memory aggregate for each sample, inserts one event per sample with source `stress_test`, then upserts the final profile once.
- Event inserts are individually best-effort. They occur before the final profile upsert and are not in a database transaction.
- `backend/scripts/simulate_learning.py` uses the same in-memory profile update function against a local JSON fixture but performs no Supabase reads or writes.

### Current-State Unused, Incomplete, and Unoptimized Items

- Signup/onboarding does not initialize `style_profiles`; the row first appears through manual `POST /profile/me`, successful finalization, or enabled stress testing.
- `POST /profile/me` and `GET /auth/me` have no frontend call path.
- Direct frontend table access is absent; all table policies describe a capability not used by the current application runtime.
- SQL declares update/delete policies, but application routes expose neither event/profile deletion nor event updates.
- Profile learning is a service-role read-modify-upsert of the entire JSON document, without a transaction, row lock, compare-and-swap condition, or RPC. Concurrent finalizations can compute from the same prior profile and overwrite one another.
- Profile upsert and event insert are separate operations. Manual finalization can persist only the profile; stress testing can persist some/all events and then fail to persist the matching final profile.
- `log_learning_event` absorbs every insert exception, so API success does not establish that history was written.
- Repeated finalization of the same output creates another profile increment and event; no event idempotency key or uniqueness constraint exists.
- `updated_at` is supplied by every backend profile upsert and independently maintained by the update trigger.
- The profile read uses `.select("profile").eq(...)` without `.single()`/`.limit(1)`; the primary key still bounds the result to at most one row.
- History selects `user_id` and returns `signals`/`persona_snapshot`, while the frontend discards `user_id` and does not render the two JSON objects.
- History rendering keys entries with nonexistent `learned_at` plus the array index even though each event response includes `id`.
- The `learning_events` table stores complete text for all three versions while the active history product surface exposes only a final excerpt.
- Database constraints do not mirror API mode/source enums or API text/profile size limits; service-role or console writes can create values outside the application contract.
- `CREATE TABLE IF NOT EXISTS` scripts do not reconcile columns/constraints on a pre-existing divergent table. The legacy migration handles only user-ID casting/FKs/policies and assumes both tables exist.
- Repository SQL does not declare table grants, sequence grants, or function privilege changes.
- No SQL RPC or database function implements the learning aggregate update; the only declared function is the profile timestamp trigger.
- Tests exercise in-memory learning and rewrite/provider behavior, but no checked-in test executes Supabase Auth, table queries, RLS behavior, profile/event persistence, transaction failure states, or the complete signup-to-history flow.

### Cross-References

- Cartographer placement and file ownership: `## CARTOGRAPHER — Project File Map`, especially “Architectural Placement.”
- Root summary of the two persisted entities and concentrated runtime files: `## SHARED MEMORY — Project Root`.
- Prior concurrency and onboarding observations: `AGENT_NOTES.md` under “Architecture & LLM Pipeline” and “Auth & Database.”
- Prior failure-path detail for profile reads and Supabase auth/configuration: `DEBUG_NOTES.md` under “DETECTIVE — Error Trace” and “INSPECTOR — Log & State Analysis.”

## SHARED MEMORY — Data Layer

PhraseAI persists two user-owned entities in Supabase: one `style_profiles` JSONB row per `auth.users` UUID and append-only `learning_events` rows containing the full original, AI, and final texts plus derived signals/persona snapshots. Both tables cascade on auth-user deletion, enable RLS, and declare own-row select/insert/update/delete policies, but the active frontend never accesses either table directly. Browser Supabase usage is Auth-only through the anon key; every table operation is performed by FastAPI with a service-role key, so verified-token query scoping rather than RLS is the active runtime isolation boundary.

Signup creates no profile row. Session establishment triggers backend profile/history reads; a missing profile is represented as `{}`. Rewrite reads the profile but writes nothing. Finalization reads and rewrites the complete profile JSON, then best-effort inserts a learning event; those operations are non-transactional, and event failure is swallowed, so profile and history can diverge. History is sourced from `learning_events`, while `profile.recent_examples` is a separate bounded excerpt list used for profile state but excluded from LLM prompts. The stress-test path inserts synthetic events before one final profile upsert and is likewise non-transactional.

The schema has one explicit composite history index and an automatic profile `updated_at` trigger. It has no repository-declared grants, mode/source checks, content-length checks, finalization uniqueness/idempotency constraint, or transactional learning RPC. Current unused surfaces include backend `POST /profile/me`, `GET /auth/me`, direct-table RLS CRUD capabilities, event update/delete policies, and returned history signal/persona data that the UI does not render.

## AI READER — LLM Integration & Style Learning

### Files Read Completely

- Root/shared memory and AI documentation: `RECON_NOTES.md`, `AGENT_NOTES.md`, `DEBUG_NOTES.md`, `README.md`, `.env.example`.
- Backend runtime and dependencies: `backend/app/main.py`, `backend/requirements.txt`, root `requirements.txt`.
- Backend validation and simulation: `backend/tests/test_pipeline.py`, `backend/scripts/simulate_learning.py`.
- Persistence definitions relevant to learning: `backend/sql/style_profiles.sql`, `backend/sql/learning_events.sql`, `backend/sql/auth_hardening_migration.sql`.
- Frontend rewrite/finalization behavior: `frontend/src/App.jsx`, `frontend/src/rewriteResponse.js`, `frontend/tests/rewriteResponse.test.js`, `frontend/package.json`, root `package.json`, and `frontend/README.md`.

### Provider Architecture and Selection

- The backend has one logical rewrite dispatch in `call_llm_rewrite()`, with two external-provider implementations and one deterministic local fallback.
- Native Anthropic uses the pinned Python package `anthropic==0.58.2` and `Anthropic.messages.create()`.
- OpenRouter uses Python standard-library `urllib.request` against an OpenAI-compatible `POST /chat/completions` endpoint; there is no OpenAI SDK dependency.
- Provider choice is implicit rather than a dedicated provider variable. `should_use_openrouter()` returns true when `ANTHROPIC_BASE_URL` contains `openrouter.ai` or `ANTHROPIC_API_KEY` starts with `sk-or-`; otherwise the native Anthropic path is used.
- Both providers load their credential from `ANTHROPIC_API_KEY`. `ANTHROPIC_BASE_URL` is optional for Anthropic and doubles as the OpenRouter switch/base URL.
- `get_openrouter_base_url()` defaults to `https://openrouter.ai/api/v1`, strips a trailing slash, and upgrades a configured URL ending in `/api` to `/api/v1`.
- `resolve_model_name()` uses explicit nonblank `LLM_MODEL` first. On native Anthropic only, the deprecated exact value `claude-sonnet-4-20250514` is replaced with `claude-sonnet-4-6`. Without `LLM_MODEL`, OpenRouter uses `OPENROUTER_DEFAULT_MODEL` or `meta-llama/llama-3.1-8b-instruct:free`; Anthropic uses `claude-sonnet-4-6`.
- OpenRouter fallback candidates come from comma-separated `OPENROUTER_FALLBACK_MODELS`. Runtime code defaults to `meta-llama/llama-3.1-8b-instruct:free,qwen/qwen-2.5-7b-instruct:free,mistralai/mistral-7b-instruct:free,openrouter/auto`; `.env.example` documents the shorter default-like value `meta-llama/llama-3.1-8b-instruct:free,openrouter/auto`.
- `GET /ai/model` publicly reports the resolved provider, model, local-fallback flag, and OpenRouter model fallback list. The frontend fetches it without authentication, ignores failures, and displays provider/model status informationally.

### Provider Calls, Parameters, and Output Parsing

- Anthropic client construction requires `ANTHROPIC_API_KEY`; absence raises HTTP 500 before a request. Optional `ANTHROPIC_BASE_URL` is passed directly to the client.
- `ANTHROPIC_TIMEOUT_SECONDS` parses as float, defaults to 30 on absence or invalid text, and is clamped to 5-120 seconds. `ANTHROPIC_MAX_RETRIES` parses as integer, defaults to 2 on invalid text, and is clamped to 0-5. Retry mechanics are delegated to the Anthropic SDK.
- Anthropic request parameters are `model=<resolved model>`, `max_tokens=<resolved budget>`, `temperature=0.4`, one system string, and one user message containing the assembled prompt.
- Anthropic system text: expert email rewriting assistant; preserve intent; produce clean, concise output; do not add explanations unless asked.
- Anthropic parsing concatenates every response content block whose `type` is `text`, strips the result, and rejects empty/whitespace output with HTTP 502.
- OpenRouter sends `model`, `messages`, `max_tokens`, and `temperature=0.4`. Its system message says draft/context are data, intent must be preserved, and only rewritten email text should be returned; the assembled prompt is the user message.
- OpenRouter headers always include bearer authorization and JSON content type. When `OPENROUTER_SITE_URL` is nonblank, it also sends `HTTP-Referer` and `X-Title`, with title from `OPENROUTER_APP_TITLE` or `PhraseAI`.
- `OPENROUTER_TIMEOUT_SECONDS` is parsed directly as float with default 25; unlike Anthropic settings, invalid text is not locally recovered and there is no clamp.
- OpenRouter JSON parsing requires a nonempty `choices` list, then reads `choices[0].message.content`. String content is accepted. List content is flattened by concatenating `text` from dictionary blocks. Missing, non-string, or whitespace-only content raises HTTP 502.
- OpenRouter tries the preferred model followed by configured fallback models, deduplicated while preserving order. It advances models only for statuses `429, 500, 502, 503, 504, 529`. Any other HTTP status stops the chain immediately. The final captured HTTP exception is re-raised.
- OpenRouter HTTP errors preserve the provider status but replace the response body with `AI provider request failed.` Other exceptions become 504 when timeout-like, otherwise 502.
- `LLM_MAX_TOKENS` parses as integer, defaults to 1200 on invalid text, and is clamped to 128-2400 for both providers. There is no separate input-token API limit; prompt size is controlled by character limits and truncation.
- All synchronous provider and Supabase operations used by async routes are moved through `asyncio.to_thread()` via `run_blocking_io()`. No streaming, cancellation propagation into provider calls, tool use, structured-output mode, or multi-turn provider conversation exists.

### Prompt Builder, Templates, and Variables

- `build_rewrite_prompt(payload, style_profile)` is the single shared user-prompt builder for both providers.
- Accepted rewrite modes are fixed by Pydantic literals:
  - `more_professional`: professional and polished while preserving intent.
  - `sound_smarter`: sharper, clearer, and more insightful while preserving intent.
  - `fix_grammar`: grammar, punctuation, and clarity corrections while preserving tone and structure.
- Prompt variables are the mode key, mode-specific instruction, derived style metadata, generated style guidance, optional user context, and draft.
- The prompt directs the model to preserve intent, treat XML-like tagged content as untrusted email data, ignore role/prompt-override requests inside tags, and return only rewritten email text.
- Draft and optional context are wrapped in `<user_draft>...</user_draft>` and `<user_context>...</user_context>`. Whitespace is collapsed before insertion.
- Draft prompt content is bounded by `MAX_DRAFT_CHARS` and context by `MAX_CONTEXT_CHARS`; overlong values passed to the helper are sliced and suffixed with `...[truncated]`. Normal API validation already enforces the same request maxima.
- Style context is produced by `profile_prompt_context()` and contains only:
  - `preferences`
  - `persona`
  - up to six entries from `guidance`
  - `learned_examples` from `stats`
- That style-context JSON is itself truncated to 1,800 characters before prompt insertion. Guidance is also rendered separately as hyphen-prefixed lines, or `- No personalized guidance yet.`.
- `recent_examples`, user ID, email, prior drafts, prior AI output, and prior final text are deliberately excluded from LLM prompts.
- Pydantic rejects empty and whitespace-only drafts. Request limits default to 12,000 draft characters and 8,000 context characters.

### Rewrite Call Chain

1. In `App.jsx`, the user enters a draft, selects one of three modes, optionally adds context, and invokes `handleRewrite()` by button or Cmd/Ctrl+Enter.
2. The browser requires a nonblank draft, sets loading state, and calls `apiFetch("/rewrite")` with `{draft, mode, context: trimmed value or null}`.
3. `apiFetch()` retrieves the Supabase session, requires an access token, sends a bearer-authenticated JSON request through the dev URL or production same-origin `/api` proxy, and aborts after 65 seconds.
4. A 401 triggers exactly one Supabase `refreshSession()` and one request retry.
5. FastAPI validates `RewriteRequest`, then `get_current_user()` parses the bearer token and asks Supabase Auth for the user. Auth/configuration failures occur before the rewrite route's provider-fallback boundary.
6. `rewrite_email()` creates a 16-character request ID, resolves provider/model/output budget, and loads `style_profiles.profile` by verified user ID.
7. Profile-load failure is logged with dependency/stage metadata and degrades to an empty style profile.
8. The route builds the prompt. Prompt-construction failure returns HTTP 500 with `{message, stage: "prompt", request_id}` and never invokes local fallback.
9. `call_llm_rewrite()` selects native Anthropic or OpenRouter and runs the blocking call in a worker thread.
10. Valid provider text returns HTTP 200 as `{rewritten, source: "provider", request_id, fallback_reason: null}`.
11. Provider exceptions are categorized. With local fallback enabled, the route generates deterministic text and still returns HTTP 200 as `source: "fallback"` with a reason. With fallback disabled, it returns generic HTTP 502 with `stage: "provider"` and the request ID.
12. The frontend parses JSON, maps non-2xx errors to `ApiRequestError`, validates successful `/rewrite` payloads, and only then stores `rewritten`, immutable baseline `lastAiOutput`, source, and diagnostics.
13. Provider fallback output remains editable and gets a warning/source badge. Transport, auth/session, backend, prompt, timeout, and malformed-response errors do not produce a browser-side rewrite.

### Deterministic Fallback and Error Classification

- `ENABLE_LOCAL_REWRITE_FALLBACK` defaults true. Truthy values are `1`, `true`, `yes`, and `on`, case-insensitive after trimming.
- Provider errors map as follows: 429 or rate-limit-like class name -> `rate_limited`; 402 -> `billing`; 401/403 or authentication/permission class name -> `authentication`; 400/404/422 -> `model_unavailable`; 408/504 or timeout-like class name -> `timeout`; everything else -> `provider_unavailable`.
- Unknown exceptions have synthetic provider status 502.
- The deterministic fallback normalizes whitespace, capitalizes the first character, adds terminal punctuation, and expands a small fixed set of shorthand tokens (`u`, `ur`, `pls`, `thx`, `im`, `dont`, `cant`, `wont`).
- `fix_grammar` returns that normalized text. `more_professional` replaces `hey`/`hi` with `Hello`, may append a sentence acknowledging context, and appends `Thank you.`. `sound_smarter` may append a context sentence and always appends a fixed clarity/strength sentence.
- The fallback receives the style profile but does not inspect or apply it; personalized metadata affects external LLM prompts only.
- If deterministic fallback somehow yields empty text, the route returns the trimmed original draft.
- The frontend validator requires nonblank `rewritten`, `source` exactly `provider` or `fallback`, and a nonblank string `request_id`. It does not validate `fallback_reason` against the backend enum.
- Frontend fallback warning text has separate messages for all six categories. In development only, stage/status/source/reason/request ID diagnostics are shown.

### Style-Learning Representation

- Learning is deterministic feature extraction and exponentially smoothed metadata. It is not an LLM call.
- `extract_style_signals(final_version)` computes:
  - word count from `\b\w+\b`
  - sentence count by splitting on `.`, `!`, or `?`, minimum one
  - average sentence length
  - contraction count from a fixed English contraction regex and contraction/word ratio clamped to 0-1
  - exclamation and question counts
  - binary-string `used`/`none` greeting detection from fixed substrings
  - binary-string `used`/`none` sign-off detection from fixed substrings
- `update_profile_from_feedback()` increments `stats.learned_examples`, stores `last_mode` and UTC ISO `last_learned_at`, then updates preferences with smoothing factor `alpha=0.3`.
- Smoothed preferences are `avg_sentence_length`, `contraction_ratio`, and `avg_exclamation_count`. Greeting and sign-off preferences are replaced by the latest example rather than smoothed.
- Persona thresholds are deterministic:
  - formality: contraction ratio >= 0.04 conversational; <= 0.015 formal; otherwise balanced.
  - directness: average sentence length >= 18 detailed; <= 12 concise; otherwise balanced.
  - energy: average exclamation count >= 1 high; >= 0.25 warm; otherwise calm.
- Persona traits are `uses greetings`, `uses sign-offs`, or `minimal openings/closings`.
- Guidance is regenerated from the current aggregate state: greeting/sign-off instructions, contractions versus formal style, and detailed versus concise sentence guidance.
- Each profile also stores a newest-first `recent_examples` entry with timestamp, mode, and 220-character excerpts of draft, AI output, and final version. It is capped at 20 entries.
- The stored profile shape is `{stats, preferences, persona, guidance, recent_examples}`. Those are also the only accepted top-level keys for manual profile upsert; serialized profile JSON defaults to a 24,000-character maximum.

### Learning and Finalization Call Chains

1. A successful provider or backend-fallback rewrite sets both editable `rewritten` and baseline `lastAiOutput` to the returned text.
2. The user may edit `rewritten`; `lastAiOutput` remains the original returned baseline.
3. `Use this version` is enabled only when both fields are nonblank. The frontend sends `{mode, draft, ai_output: lastAiOutput, final_version: rewritten}` to `POST /learn`.
4. Backend `LearnRequest` requires the same three modes and nonempty strings. Draft is bounded by `MAX_DRAFT_CHARS`; AI output and final version by `MAX_FINAL_CHARS`, default 12,000 each.
5. `/learn` loads the existing style profile, derives the next profile from the final version, separately extracts the same signals, and takes the resulting persona snapshot.
6. It upserts the entire JSON profile into `style_profiles`, keyed by the verified Supabase user UUID.
7. It then inserts a `learning_events` row containing full raw draft, full raw AI output, full raw final version, source `manual`, derived signals, and persona snapshot.
8. The response returns the full next profile and learned-example count. The frontend replaces local profile state, reloads recent events, and reports that future rewrites will adapt.
9. History retrieval selects recent events by user and descending creation time but returns only a 220-character normalized final excerpt plus source, signals, and persona snapshot; it does not return raw draft or AI output to this UI.
- The profile update is a non-atomic read-modify-write sequence. The learning-event insert is best-effort inside `log_learning_event()`; its exception is sanitized and swallowed, so profile persistence can succeed while event history is missing.
- The browser does not require the final version to differ from the AI output. Clicking finalization without editing still creates a learning update.
- A backend fallback rewrite can be finalized exactly like provider output; the learning event is still marked `manual`, and no provider/fallback source is passed from the frontend to `/learn`.

### Persistence and Access Boundaries

- `style_profiles` stores one row per auth UUID with `profile jsonb` and `updated_at`. A trigger refreshes `updated_at` on update.
- `learning_events` stores full raw learning triples and JSON signal/persona snapshots, indexed by `(user_id, created_at desc)`.
- Both tables reference `auth.users(id)` with cascade deletion and have select/insert/update/delete RLS policies scoped to `auth.uid() = user_id`.
- Backend database access uses `SUPABASE_SERVICE_ROLE_KEY`, with `SUPABASE_KEY` as a backward-compatible fallback. Because service-role access bypasses RLS, backend helpers derive user IDs only from validated bearer tokens.
- `/profile/me` supports direct profile retrieval and whole-profile upsert. This is separate from deterministic `/learn` aggregation and accepts any bounded JSON matching the allowed top-level keys.
- The auth hardening migration deletes non-UUID legacy rows, converts IDs to UUID, restores foreign keys, and recreates RLS policies transactionally.

### Simulator, Stress Path, and Tests

- `backend/scripts/simulate_learning.py` makes no provider or database calls. It reads a caller-supplied JSON fixture with `phaseA` and `phaseB`, strips optional Markdown JSON fences, repeatedly invokes the production `LearnRequest` and `update_profile_from_feedback()`, and prints aggregate profile state.
- `POST /dev/stress-test` is bearer-authenticated and disabled unless `ALLOW_DEV_STRESS_TEST` is exactly lowercase-normalized `true`. It creates two deterministic phases of synthetic formal then conversational examples, applies updates in memory, logs every event as `stress_test`, and performs one final profile upsert.
- Stress request size is 3-50 samples per phase; generated total is twice that number. The development frontend always requests 15 per phase, producing 30 events.
- Backend tests cover error categorization, deployment boolean parsing, deprecated model replacement, prompt privacy/tagging, derived-only style prompt context, profile increment/history creation, backend-owned billing/rate-limit/timeout/auth fallbacks, typed prompt-stage failure, whitespace-only draft rejection, OpenRouter timeout status, and malformed OpenRouter response rejection.
- Frontend tests cover acceptance of complete provider/fallback responses and rejection of malformed successful responses.
- Tests mock provider/profile boundaries; they do not exercise live Anthropic/OpenRouter, Supabase persistence, OpenRouter multi-model retry ordering, Anthropic SDK retries, deterministic fallback text variants, concurrent learning updates, or end-to-end finalization.

### Raw Text Versus Learned Model

- Raw current draft and optional context are sent to the selected external LLM during rewriting.
- Raw prior examples are not sent to the LLM. Only deterministic aggregate preferences/persona/guidance and learned-example count are included.
- Raw draft, AI output, and approved final version are persisted in `learning_events`; bounded excerpts of all three are also duplicated inside profile `recent_examples`.
- The active personalization mechanism is plain JSON metadata and fixed rules. There are no embeddings, vector columns, vector database calls, similarity search, retrieval-augmented generation, fine-tuning jobs, adapters, model training, classifiers, or learned numeric weights beyond hand-coded exponential smoothing.
- The only "model" persisted per user is deterministic metadata; the external foundation model remains the globally configured Anthropic/OpenRouter model.

### Limits, Failures, and Edge Cases

- Environment integer parsing at module import for `MAX_DRAFT_CHARS`, `MAX_CONTEXT_CHARS`, `MAX_FINAL_CHARS`, and `MAX_PROFILE_JSON_CHARS` is unguarded; invalid values prevent module startup.
- Auth, missing backend Supabase configuration, and token-validation failures happen before rewrite fallback. Profile-read failure alone is tolerated and removes personalization for that request.
- Prompt failure is typed HTTP 500. Provider failure becomes HTTP 200 degraded output when fallback is enabled, otherwise a generic HTTP 502 regardless of original provider status.
- OpenRouter retries alternate models only for the fixed transient-status set. A 401/402/403/400/404/422 stops immediately and is categorized after leaving the provider adapter.
- OpenRouter list-content parsing assumes each dictionary block's `text` is string-compatible for `join`; unusual provider block shapes can raise and be classified as provider failure.
- Anthropic accepts text blocks only; non-text blocks are ignored, and an all-non-text response becomes empty-output failure.
- The browser timeout is 65 seconds, while Anthropic permits up to 120 seconds and SDK retries; a browser request can terminate before backend provider work finishes.
- Successful rewrite validation requires the new response contract including `request_id`; an older backend returning only `{rewritten}` or `{rewritten, source}` is rejected as incomplete.
- Frontend profile/history loading silently degrades to empty state. `/learn` errors are shown as a finalization message and leave the edited text in place.
- Learning signal detection is English and substring/regex based. Greeting/sign-off detection may match tokens anywhere in the text, sentence splitting is punctuation-only, and averaging starts from the first observed signal because missing prior values default to the current value.
- Existing unexpected nested profile values can cause prompt construction or numeric conversion failures. Rewrite prompt failures are isolated as stage `prompt`; learning conversion failures become generic storage-style HTTP 500 responses.
- Observability estimates prompt tokens as character count divided by four and logs provider, model, budget, latency, source, status, safe category, and exception class without prompts, content, users, tokens, provider bodies, or exception messages.
- A process-local deque tracks rewrite outcomes for fallback-rate alerts using configurable window, minimum request count, rate, and cooldown. State is per backend process and resets on restart.

## SHARED MEMORY — AI Pipeline

PhraseAI's live AI path is `React handleRewrite` -> authenticated `apiFetch` -> FastAPI `/rewrite` -> Supabase token validation -> per-user JSON profile load -> shared prompt builder -> native Anthropic or OpenRouter -> parsed plain-text rewrite. Provider selection is inferred from `ANTHROPIC_BASE_URL` or an `sk-or-` key. Both paths use temperature `0.4` and a clamped 128-2400 output-token budget. OpenRouter retries a deduplicated model list only on transient statuses; Anthropic retries are delegated to its SDK.

The prompt includes raw current draft/context inside untrusted-data tags, the selected mode instruction, and derived profile metadata. It excludes user identity and all raw historical examples. External-provider failures are categorized and normally become HTTP 200 deterministic backend fallback responses; auth, transport, prompt, and backend failures do not trigger a browser-generated rewrite.

Style learning is a separate non-LLM finalization path: editable output plus the original AI/fallback baseline are posted to `/learn`; the backend extracts fixed text statistics, smooths numeric preferences with alpha `0.3`, derives persona thresholds and guidance, upserts one JSON profile, and stores a raw learning-event record. Future prompts consume only aggregate profile fields. The system uses raw text persistence plus deterministic metadata, not vectors, embeddings, retrieval, or fine-tuning.

The profile is `{stats, preferences, persona, guidance, recent_examples}`. `learning_events` retains full draft/AI/final text and signal snapshots; profile history retains only 220-character excerpts, capped at 20. Profile update is read-modify-write and event logging is best-effort. Backend fallback text does not use the style profile even though it receives it, and fallback results can be finalized and learned like provider results.

## AUTH READER — Authentication & Security

### Authentication Surface

- Supabase Auth is the only account/authentication system. The frontend creates one browser client from `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; the backend creates service-role Supabase clients from `SUPABASE_URL` plus `SUPABASE_SERVICE_ROLE_KEY`, with `SUPABASE_KEY` accepted as a compatibility alias.
- Signup calls `supabase.auth.signUp({ email, password })`. The form uses browser `type="email"`, `required`, and an eight-character `minLength`; no name, organization, or use-case metadata is submitted.
- Login calls `supabase.auth.signInWithPassword({ email, password })`. Email normalization is used only as the key for an in-memory client attempt counter; the original form values are sent to Supabase.
- The login counter permits five counted invalid-credential responses per normalized email in a 15-minute window. It exists only in a React ref, resets on reload/new tab, and counts only errors whose message matches `invalid login credentials`; no repository code configures server-side Auth throttling or CAPTCHA.
- Signup and login errors are displayed from Supabase's client error message. Signup reports that confirmation may be required, but confirmation policy and email-link behavior are controlled outside this repository by Supabase project settings.
- Forgot-password calls `resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin })`, clears that email's local login-attempt record after success, and reports the Supabase error message on failure.
- `onAuthStateChange` recognizes `PASSWORD_RECOVERY`, enters a dedicated recovery mode, and retains the recovery session supplied by Supabase. Password update calls `supabase.auth.updateUser({ password })`; the form applies the same eight-character browser minimum. On success, the recovery flag is cleared and the existing session remains active.
- Sign-out calls `supabase.auth.signOut()` and then clears composer/output/context/status state. The auth-state listener is responsible for replacing the session with `null`; the handler does not inspect or display a sign-out error.
- There is no OAuth/social/provider login call, provider button, PKCE-specific application logic, magic-link login UI, phone auth, MFA, account deletion, email-change flow, or ordinary in-app password-change flow. Recovery is the only password update surface.

### Session Bootstrap, Persistence, and Refresh

- `createClient` uses Supabase JS defaults; the application does not override storage, `persistSession`, `autoRefreshToken`, or URL-session detection. Session persistence and refresh therefore follow the installed Supabase client's browser defaults.
- At mount, `getSession()` initializes React session state. Missing frontend Supabase configuration resolves to the login screen with a configuration error. Bootstrap exceptions also resolve to the login screen and set `authReady`, avoiding an indefinite loading state.
- `VITE_FORCE_LOGIN_ON_VISIT=true` signs out any restored session during bootstrap and shows the login screen. Its default is false.
- `onAuthStateChange` updates session state for all emitted auth events and is unsubscribed on component cleanup. A session access-token change triggers profile and learning-history loads; loss of a token clears both datasets.
- The frontend guard is render-based: until bootstrap completes it shows `Loading session...`; without `session.access_token`, or while recovery mode is active, it renders the auth screen; otherwise it renders the application shell.
- Every application API call re-reads `supabase.auth.getSession()`, prefers that returned session over React state, and sends `Authorization: Bearer <access_token>`. A first backend `401` causes one `refreshSession()` call and one retry with the refreshed access token. A second `401` is surfaced as an expired-session message; this path does not itself call sign-out.
- Authenticated fetches have a 65-second `AbortController` timeout and always set JSON content type. Session, transport, timeout, response-shape, and backend stages are represented separately in frontend errors. Profile/history load failures are suppressed into empty state.
- Theme is the only application value explicitly stored through `localStorage`; auth token storage is delegated to Supabase JS. No application cookies or custom session storage are implemented.

### Backend Bearer Validation and Route Enforcement

- `parse_bearer_token` requires a non-empty `Authorization` header with case-insensitive `Bearer` scheme and returns `401` for a missing header or malformed scheme/value.
- `get_current_user` creates the backend Supabase client and validates the token by calling `supabase.auth.get_user(token)` in a worker thread. Any exception is logged only by component, operation, and exception class, then returned as generic `401 Invalid or expired auth token`.
- The dependency accepts either object-shaped or dictionary-shaped Supabase responses, extracts `user.id` and `user.email`, and requires a non-empty string ID. Protected handlers use the returned ID rather than any caller-supplied ownership field.
- Protected routes are `GET /auth/me`, `POST /rewrite`, `GET /profile/me`, `POST /profile/me`, `POST /learn`, `POST /dev/stress-test`, and `GET /learning-events/me`. Public routes are `GET /`, `GET /health`, `GET /ai/model`, FastAPI's default `/docs`, `/redoc`, and `/openapi.json`.
- Missing backend Supabase URL/key produces a `500 Backend Supabase configuration is incomplete` before token validation. Auth-service exceptions, including availability/configuration failures raised during `get_user`, are flattened to `401`.
- The public model endpoint exposes provider selection, resolved model name, local-fallback status, and configured OpenRouter fallback model names.

### Supabase, Service Role, and RLS Trust Boundary

- The browser receives only the Supabase anon key and uses Supabase Auth directly. The documented boundary places the service-role key only in backend environment files; `.gitignore` and `.dockerignore` exclude `.env` files, and no runtime `.env` file or committed secret value is present.
- All backend database operations use the service-role client. Service-role access bypasses Postgres RLS, so effective API isolation is established by successful bearer validation plus explicit `.eq("user_id", verified_user_id)` filters and server-created `user_id` values.
- Profile reads filter by verified user ID. Profile writes/upserts inject verified user ID and do not accept ownership from request JSON. Learning-event inserts inject verified user ID. History reads filter by verified user ID and return excerpts rather than complete final text.
- `style_profiles.user_id` is a UUID primary key referencing `auth.users(id)` with cascade delete. `learning_events.user_id` is a non-null UUID foreign key to `auth.users(id)` with cascade delete and a `(user_id, created_at desc)` index.
- Both tables enable RLS and define select, insert, update, and delete policies using `auth.uid() = user_id`. These policies govern direct anon/authenticated PostgREST access; backend service-role operations are not constrained by them.
- The profile timestamp trigger is `security invoker` with `search_path = public`.
- The legacy migration runs in a transaction, disables RLS, deletes non-UUID legacy ownership rows, casts both ownership columns to UUID, restores auth foreign keys, re-enables RLS, recreates all ownership policies, and commits. A transaction failure rolls back the temporary RLS disablement and preceding changes.
- Raw drafts, AI outputs, and final versions are persisted in `learning_events`; bounded excerpts are also retained in the profile's `recent_examples`. Prompt construction excludes `recent_examples` and sends only derived preferences/persona/guidance/stat count to the provider.

### CORS, Headers, and Browser Boundary

- Production frontend API calls always use same-origin `/api`; both Vercel configurations rewrite `/api/(.*)` to the Railway backend. `VITE_API_URL` affects development only, where it defaults to `/api`; Vite's dev proxy forwards `/api` to `http://localhost:8000`.
- Backend CORS origins combine comma-separated `FRONTEND_ORIGIN` values with localhost, the canonical production domain, three named Vercel preview domains, and a regex for matching project preview domains.
- CORS allows `GET`, `POST`, and `OPTIONS`; request headers are limited to `Authorization` and `Content-Type`; credentials are disabled. Authentication is carried in the bearer header rather than browser cookies.
- The repository defines no application security-header middleware and no Vercel `headers` rules. `index.html` has no Content Security Policy meta tag. HSTS, CSP, frame restrictions, MIME-sniffing restrictions, referrer policy, and permissions policy are not set by repository code.
- React renders user and backend data through normal JSX text bindings; the auth/security read found no `dangerouslySetInnerHTML` or direct `innerHTML` use.

### Validation, Limits, and Failure Disclosure

- Rewrite requests restrict mode to three literals, drafts to 1-12,000 characters with explicit whitespace-only rejection, and context to 8,000 characters. Learning requests limit draft to 12,000 and AI/final output to 12,000 each. Stress-test samples are constrained to 3-50.
- Profile JSON accepts only `stats`, `preferences`, `persona`, `guidance`, and `recent_examples`, with a serialized maximum of 24,000 characters. Nested structures are not schema-typed beyond the top-level dictionary/key/size checks.
- Learning-history `limit` is clamped server-side to 1-200. Provider output tokens are clamped to 128-2,400. Prompt content is whitespace-normalized, bounded, delimited as untrusted data, and accompanied by injection-resistance instructions.
- `ALLOW_DEV_STRESS_TEST` gates the protected synthetic-write endpoint; exact lowercase `true` is required. The frontend renders its trigger only when Vite `DEV` is true, while backend access is independently controlled by the environment flag.
- Storage failures return stable generic `500` messages and log exception class only. Provider response bodies are not returned to clients. Auth validation logs exclude token, user ID, and email.
- Frontend API handling maps `401` and `422` to stable UI messages, but otherwise permits backend string `detail` or typed `problem.message` to become the displayed error. Direct Supabase signup/login/reset/update errors are displayed from Supabase messages.
- FastAPI/Pydantic request validation supplies default `422` behavior. No custom global exception handler, request-body-size middleware, per-IP API throttling, CSRF mechanism, or backend CAPTCHA integration is present. The bearer-header/no-cookie API design does not use ambient browser credentials.

### Environment and Configuration Inventory

- Frontend build/runtime: `VITE_SUPABASE_URL` selects the public Supabase project; `VITE_SUPABASE_ANON_KEY` authenticates the browser client at anon scope; `VITE_FORCE_LOGIN_ON_VISIT` optionally discards restored sessions; `VITE_API_URL` selects the development API base only; Vite `DEV` selects development API behavior, diagnostics, and visibility of the stress-test control.
- Supabase backend: `SUPABASE_URL` selects the project; `SUPABASE_SERVICE_ROLE_KEY` is the preferred privileged database/Auth client credential; `SUPABASE_KEY` is an undocumented-in-example compatibility fallback with the same backend use.
- CORS/deployment: `FRONTEND_ORIGIN` adds comma-separated allowed origins; `PORT` selects the Uvicorn listener in Dockerfile, Railway, Nixpacks, and Procfile commands; `NIXPACKS_PYTHON_VERSION=3.11` selects the Nixpacks interpreter; `PYTHONDONTWRITEBYTECODE=1` and `PYTHONUNBUFFERED=1` control Python container runtime behavior.
- Provider credentials/routing: `ANTHROPIC_API_KEY` supplies the Anthropic or OpenRouter secret and also identifies OpenRouter keys by `sk-or-` prefix; `ANTHROPIC_BASE_URL` overrides the Anthropic endpoint and selects OpenRouter when its hostname contains `openrouter.ai`; `LLM_MODEL` selects the model; `ANTHROPIC_TIMEOUT_SECONDS` and `ANTHROPIC_MAX_RETRIES` configure the Anthropic client; `LLM_MAX_TOKENS` sets the clamped output budget.
- OpenRouter: `OPENROUTER_DEFAULT_MODEL` supplies the default when no `LLM_MODEL` is set; `OPENROUTER_FALLBACK_MODELS` supplies the comma-separated retry model list; `OPENROUTER_TIMEOUT_SECONDS` controls HTTP timeout; `OPENROUTER_SITE_URL` adds `HTTP-Referer`; `OPENROUTER_APP_TITLE` adds `X-Title` only when the site URL is non-empty.
- Data and feature limits: `MAX_DRAFT_CHARS`, `MAX_CONTEXT_CHARS`, `MAX_FINAL_CHARS`, and `MAX_PROFILE_JSON_CHARS` configure Pydantic/profile bounds at module import; `ENABLE_LOCAL_REWRITE_FALLBACK` controls deterministic fallback through the common boolean parser; `ALLOW_DEV_STRESS_TEST` controls the synthetic learning endpoint through an exact string comparison.
- Monitoring: `FALLBACK_ALERT_WINDOW_SECONDS`, `FALLBACK_ALERT_MIN_REQUESTS`, `FALLBACK_ALERT_RATE`, and `FALLBACK_ALERT_COOLDOWN_SECONDS` configure the in-process fallback-rate alert window and threshold.
- `.env.example` documents all directly named application variables except the backend compatibility alias `SUPABASE_KEY`, deployment `PORT`, container Python flags, Nixpacks version, and Vite's built-in `DEV`. `README.md` documents `SUPABASE_KEY` compatibility and deployment `PORT`, but its production Vercel instructions list `VITE_API_URL` even though production code fixes the API base to `/api`.

### Security Test Coverage Observed

- Backend tests cover provider error categorization, boolean env parsing, deprecated model replacement, exclusion of raw history/user identifiers from prompts, derived-only profile prompt context, whitespace-only draft rejection, provider fallback categories, typed prompt failure, OpenRouter timeout status, and malformed provider output.
- Frontend tests cover only rewrite-response contract validation. Repository tests do not directly exercise signup/login/logout/reset/update flows, session bootstrap/persistence/refresh, bearer parsing, `get_current_user`, protected-route rejection, service-role query scoping, RLS policies/migration execution, CORS behavior, or security headers.
- Prior shared audit notes report manual desktop/mobile sign-in layout checks and explicitly state that an authenticated browser workflow was not exercised because local Supabase credentials were absent. This matches the test files and the absence of runtime `.env` credentials in the workspace.

## SHARED MEMORY — Auth & Security

PhraseAI delegates account creation, password login, email recovery, password update, session persistence, refresh, and logout to Supabase Auth. The React app restores a Supabase session at startup, listens for auth changes including `PASSWORD_RECOVERY`, guards the shell on `session.access_token`, attaches the access token as a bearer header, and retries one backend `401` after `refreshSession()`. Login abuse control in repository code is a per-tab in-memory UX counter, not a server-side control. OAuth, MFA, CAPTCHA, cookie sessions, and custom JWT validation are absent.

The FastAPI boundary parses bearer headers and validates each protected request with `supabase.auth.get_user(token)`. Seven routes require this dependency; root, health, model metadata, and default API documentation/schema routes are public. Backend data access uses a service-role Supabase client, so RLS does not constrain server queries: tenant isolation depends on validated user identity and every helper binding that verified ID into filters and writes. The SQL schemas independently enable full CRUD ownership policies for direct authenticated Supabase access and tie both tables to `auth.users`.

Production browser traffic uses the Vercel same-origin `/api` rewrite, while backend CORS also permits configured, canonical, and project-preview Vercel origins with bearer/content-type headers, no credentials, and GET/POST/OPTIONS methods. Repository code contains no explicit browser security headers. Inputs and profile payloads are bounded, prompt history is filtered to derived metadata, logs avoid content/tokens/user identifiers, and storage/provider failures are generally sanitized. Direct Supabase auth messages remain user-visible. Security-relevant automated coverage is concentrated on provider/prompt validation rather than auth lifecycle, bearer enforcement, service-role scoping, RLS, CORS, or headers.

### Phase 1 Verification Addenda

- Frontend rewrite-response validation rejects missing IDs but accepts a whitespace-only `request_id` because it checks truthiness rather than trimmed content.
- Several JSX modifier classes have no matching CSS rule, including `source-dot`, `account-button active`, `is-loading`, `wide`, `medium`, and `button-spinner dark`; provider and fallback source badges share the same visual treatment.
- Finalization sends the current draft and current mode with the prior rewrite baseline. Editing the draft or mode after rewriting can therefore create a learning record whose inputs no longer describe the generated baseline; optional context is not stored in learning feedback.
- Manual `/learn` events always use source `manual`, so persisted history does not preserve whether the baseline came from a provider or deterministic fallback. The learning request fields have minimum length one but no whitespace-only validator.
- Manual profile upsert validates top-level keys and total JSON size but not nested value schemas. Unexpected nested content can later enter prompts or break numeric learning conversions.
- `learning_events` is append-only by application behavior, not by database enforcement: its RLS policies permit owner updates and deletes.
- There is no application retention period, export route, or deletion route for stored raw drafts, AI outputs, and final versions; deletion is available indirectly through the foreign-key cascade when the Supabase Auth user is deleted externally.
- OpenRouter can retry alternate models, but successful responses return only text, so logs and API responses identify the preferred configured model rather than the fallback model that may have produced the result.
- Invalid `FALLBACK_ALERT_*` environment values are parsed during rewrite outcome recording and can turn an otherwise successful rewrite into an unhandled server error.
- All `VITE_*` values are public build-time configuration. Supabase-hosted password policy, JWT lifetime, confirmation, redirect allowlist, CAPTCHA, throttling, SMTP, and breached-password settings are external to this repository and cannot be verified here.
- The SQL policy declarations do not specify explicit roles or repository-owned `GRANT`/`REVOKE` statements; direct PostgREST exposure also depends on Supabase-managed privileges.
- The repository's local virtual environment reports Python 3.14.4, while deployment configuration selects Python 3.11.
- `.dockerignore` excludes one explicit backend cache path rather than every nested Python cache, and environment variants such as `.env.production` or `.env.test` are not covered by the repository's narrow ignore patterns.
- ESLint configuration imports packages that are absent from the frontend manifest and lockfile. npm dependencies are locked, while Python transitive dependencies are not.
- The project has no CI definition, package-manager version pin, root test/lint command, container health check, or single command that starts frontend and backend together.
- `README.md`, `AGENT_NOTES.md`, and the opening of `DEBUG_NOTES.md` contain stale statements relative to the current implementation and 13-test backend suite.

## FULL SYSTEM SUMMARY

PhraseAI is a responsive React 19 single-page application for authenticated email rewriting. A user signs up or signs in through Supabase Auth, writes an email, selects one of three rewrite modes, optionally adds context, and sends the request through a Vercel same-origin `/api` proxy to a FastAPI service running on Railway. The frontend keeps workflow, navigation, profile, history, loading, and error state in one large `App.jsx` component; it displays editable provider or fallback output and lets the user approve that output as a learning example.

The FastAPI backend validates the Supabase bearer token on every protected request, loads the user's JSON style profile, builds a bounded prompt containing the current draft, optional context, rewrite mode, and derived style metadata, and calls either Anthropic or OpenRouter. Provider output is returned as plain text; categorized provider failures normally become deterministic backend fallback rewrites, while authentication, transport, prompt-construction, and other backend failures remain errors. Blocking provider, authentication, and database client operations are moved to worker threads, and privacy-safe structured logs track request stage, provider, timing, and fallback categories without recording message content or user identity.

PhraseAI's personalization is deterministic rather than trained. When a user approves a version, the backend extracts simple statistics such as sentence length, contraction rate, greeting/sign-off use, punctuation, and energy; it smooths those values into a per-user profile and turns them into persona labels and prompt guidance for future rewrites. There are no embeddings, vectors, retrieval, fine-tuning, or per-user model weights. Raw draft, generated output, and approved final text are stored in `learning_events`, while bounded excerpts are also retained in the profile's recent examples but excluded from provider prompts.

Supabase provides both identity and Postgres storage. `style_profiles` holds one evolving JSON profile per auth user, and `learning_events` holds the history of finalized rewrites and derived signals. Both schemas have UUID foreign keys, cascade deletion, indexes or timestamp maintenance where applicable, and owner-scoped RLS policies; the backend itself uses a service-role credential that bypasses RLS, so its verified-user query filters are the effective tenant boundary. Profile update and history insertion are separate operations, and concurrent or partial failures can make aggregate profile state and event history diverge.

The repository is a compact monorepo with most behavior concentrated in `frontend/src/App.jsx` and `backend/app/main.py`. Vite, Tailwind/PostCSS, and Vercel build the frontend; FastAPI, Uvicorn, Docker/Railway, Supabase, and Anthropic/OpenRouter support the backend. Automated coverage includes 13 backend pipeline/route tests and focused frontend rewrite-response validation, but not a full authenticated browser journey. Configuration and prior audit documents describe the system broadly, though some dependency, ignore, deployment, and documentation details no longer exactly match the current source.

## TESTER — Live Trial Result

### Trial Target

- Deployed application: `https://phraseai-nico.vercel.app/?v=87bcc5e`
- Test email prepared for entry: `Hey, just wanted to check in and see if you had a chance to look at the proposal I sent over last week. Let me know if you have any questions or need anything else from me. Thanks.`
- Test date: June 10, 2026

### Observed User Journey

1. The production page loaded and initially displayed `Loading session...`.
2. Session bootstrap completed and rendered the PhraseAI sign-in experience with email and password fields, password recovery, account creation, theme control, provider status (`anthropic connected`), and privacy messaging.
3. The browser had no persisted Supabase session.
4. The repository contains no frontend or backend runtime `.env` files, authorized test credentials, demo account, or reusable authentication fixture. Prior audit notes explicitly identify a dedicated non-production Supabase test account as an outstanding prerequisite.
5. Because the authenticated application shell was not reachable, the email composer, rewrite-mode controls, and rewrite action were never exposed.

### Failure Boundary

`// TESTER: [FAILURE POINT] frontend/src/App.jsx authentication guard — the live trial stopped before the composer because no authorized Supabase test session or test-account credentials were available.`

This is a test-environment prerequisite failure rather than an observed rewrite-pipeline failure. No credentials were invented, no external account was created, and no source files were changed. The frontend never called `POST /rewrite`, so the FastAPI authentication dependency, profile load, prompt construction, provider call, deterministic fallback, and response rendering were not exercised.

### Exact Outcome

- Rewrite appeared: **Not tested; composer inaccessible without authentication.**
- Rewrite quality: **Not rateable.**
- Rewrite speed: **Not rateable.**
- UI loading behavior: **The session-loading state transitioned cleanly to the sign-in screen.**
- Error shown: **No application error appeared.**
- Legacy fallback message `AI service is temporarily unavailable`: **Did not appear.**
- Quality rating: **N/A**
- Speed rating: **N/A**
- UI smoothness rating: **8/10 for the observed session bootstrap and sign-in transition only; the rewrite workflow itself was not reached.**

### Verdict

The deployed PhraseAI entry experience is online and its authentication gate behaves coherently, but the core email rewrite feature could not be validated end to end from the available environment. A real user must authenticate before the composer exists, and this reconnaissance session had neither an existing Supabase session nor an authorized test account. The test therefore provides no live evidence that the production rewrite currently succeeds or fails; it establishes only that execution stops at the expected authentication boundary before any AI request is made.
