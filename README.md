# PhraseAI

PhraseAI is an AI-powered email rewriting tool that helps users improve drafts and will later learn their writing style over time.

Link for the website: https://phraseai-nico.vercel.app/?v=87bcc5e

This repository includes:
- Frontend: React + Tailwind CSS (Vite)
- Backend: FastAPI
- Database/Auth provider: Supabase (Postgres + Auth-ready)
- AI provider: Anthropic Claude API

## Project Structure

```
frontend/    # Vite React app
backend/     # FastAPI service
requirements.txt  # Root dependency bridge for Railway/Nixpacks
nixpacks.toml  # Forces Railway build to Python backend in monorepo
```

## Prerequisites

- Node.js 18+
- Python 3.10+
- Supabase project with table `style_profiles`
- Anthropic API key

## Environment Variables

Use only these runtime env files:
- `frontend/.env`
- `backend/.env`

Do not use a root `.env` file.

Frontend (`frontend/.env`):
- `VITE_API_URL` (example: `http://localhost:8000`)
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Backend (`backend/.env`):
- `ANTHROPIC_API_KEY` (use your OpenRouter key here when using OpenRouter)
- `ANTHROPIC_BASE_URL` (set to `https://openrouter.ai/api` for OpenRouter)
- `LLM_MODEL` (optional, defaults to `claude-sonnet-4-20250514`)
- `LLM_MAX_TOKENS` (optional, defaults to `1200`)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_KEY` for backwards compatibility)
- `FRONTEND_ORIGIN` (example: `http://localhost:5173`)
- `ALLOW_DEV_STRESS_TEST` (optional, set `true` only in safe dev environments)

### Where To Find Supabase Values

1. Go to your Supabase project dashboard.
2. Open **Project Settings** (gear icon, bottom left).
3. Open **API**.
4. Copy **Project URL** into `SUPABASE_URL`.
5. Copy **service_role** key into `SUPABASE_SERVICE_ROLE_KEY`.
6. Copy **anon public** key into `VITE_SUPABASE_ANON_KEY`.

Important:
- Use `service_role` only in backend/server env files.
- Never put `service_role` in `frontend/.env`.
- Use only the anon key in frontend.

### Using OpenRouter or Other Models

You can switch from Anthropic Claude to another model (for example MiniMax via OpenRouter) without code changes.

Set these in `backend/.env`:

```env
ANTHROPIC_API_KEY=your_openrouter_key
ANTHROPIC_BASE_URL=https://openrouter.ai/api/v1
LLM_MODEL=openrouter/free
LLM_MAX_TOKENS=1200
```

If you use Anthropic directly, keep `ANTHROPIC_BASE_URL` empty and put your Anthropic key in `ANTHROPIC_API_KEY`.

Then restart the backend server.

Note: free models can return rate-limit errors (`429`) or temporary access errors.

## Setup

### 1. Frontend

```bash
cd frontend
npm install
npm run dev
```

### 2. Backend

```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
# source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Supabase Table

Run the SQL in:
- `backend/sql/style_profiles.sql`
- `backend/sql/learning_events.sql`

### style_profiles

```sql
create table if not exists public.style_profiles (
	user_id uuid primary key references auth.users(id) on delete cascade,
	profile jsonb not null default '{}'::jsonb,
	updated_at timestamptz not null default now()
);
```

### learning_events

```sql
create table if not exists public.learning_events (
	id bigserial primary key,
	user_id uuid not null references auth.users(id) on delete cascade,
	mode text not null,
	source text not null default 'manual',
	draft text not null,
	ai_output text not null,
	final_version text not null,
	signals jsonb not null default '{}'::jsonb,
	persona_snapshot jsonb not null default '{}'::jsonb,
	created_at timestamptz not null default now()
);
```

For existing deployments that used text user IDs, run `backend/sql/auth_hardening_migration.sql` first.

## API Endpoints

- `POST /rewrite`
	- Auth: Bearer token required
	- Input: `{ draft, mode, context? }`
	- mode: `more_professional` | `sound_smarter` | `fix_grammar`
	- Returns rewritten email using Claude/OpenRouter
- `POST /learn`
	- Auth: Bearer token required
	- Input: `{ mode, draft, ai_output, final_version }`
	- Learns writing preferences from the user-edited final version and updates profile guidance
- `POST /dev/stress-test`
	- Auth: Bearer token required
	- Input: `{ samples_per_phase }`
	- Must set `ALLOW_DEV_STRESS_TEST=true`
	- Runs synthetic stress inputs (formal phase + conversational phase) and updates profile
	
- `GET /learning-events/me?limit=25`
	- Auth: Bearer token required
	- Returns recent learning events with source, signals, and persona snapshot
- `GET /profile/me`
	- Auth: Bearer token required
	- Returns style profile or empty object
- `POST /profile/me`
	- Auth: Bearer token required
	- Upserts style profile JSON

## Deploy

- Frontend (Vercel):
	- Root directory: `frontend`
	- Build command: `npm run build`
	- Output directory: `dist`
	- Environment variables:
		- `VITE_API_URL=https://<your-railway-domain>`
		- `VITE_SUPABASE_URL=https://<your-supabase-project-ref>.supabase.co`
		- `VITE_SUPABASE_ANON_KEY=<your-anon-key>`
- Backend (Railway):
	- Root directory: repository root (uses `railway.toml`)
	- Start command from `railway.toml`: `cd backend && uvicorn app.main:app --host 0.0.0.0 --port ${PORT}`
	- Required environment variables:
		- `ANTHROPIC_API_KEY`
		- `ANTHROPIC_BASE_URL` (optional)
		- `LLM_MODEL` (optional)
		- `LLM_MAX_TOKENS` (optional)
		- `SUPABASE_URL`
		- `SUPABASE_SERVICE_ROLE_KEY`
		- `FRONTEND_ORIGIN=https://<your-vercel-domain>`

### Go-Live Checklist

1. Run SQL in `backend/sql/style_profiles.sql` and `backend/sql/learning_events.sql` on Supabase.
2. If your DB has old text-based user IDs, run `backend/sql/auth_hardening_migration.sql`.
3. Deploy backend to Railway and set all backend env vars.
4. Copy Railway public URL.
5. Deploy frontend to Vercel with root directory `frontend`.
6. Set `VITE_API_URL`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_ANON_KEY` in Vercel and redeploy.
7. Update Railway `FRONTEND_ORIGIN` to your Vercel URL.
8. Test sign-up/sign-in, rewrite once, finalize version, then verify profile/history update.
