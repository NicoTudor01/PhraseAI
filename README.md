# PhraseAI

PhraseAI is an AI-powered email rewriting tool that helps users improve drafts and will later learn their writing style over time.

This repository includes:
- Frontend: React + Tailwind CSS (Vite)
- Backend: FastAPI
- Database/Auth provider: Supabase (Postgres + Auth-ready)
- AI provider: Anthropic Claude API

## Project Structure

```
frontend/    # Vite React app
backend/     # FastAPI service
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

Backend (`backend/.env`):
- `ANTHROPIC_API_KEY` (use your OpenRouter key here when using OpenRouter)
- `ANTHROPIC_BASE_URL` (set to `https://openrouter.ai/api` for OpenRouter)
- `LLM_MODEL` (optional, defaults to `claude-sonnet-4-20250514`)
- `LLM_MAX_TOKENS` (optional, defaults to `1200`)
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `FRONTEND_ORIGIN` (example: `http://localhost:5173`)

### Where To Find Supabase Values

1. Go to your Supabase project dashboard.
2. Open **Project Settings** (gear icon, bottom left).
3. Open **API**.
4. Copy **Project URL** into `SUPABASE_URL`.
5. Copy **service_role** key into `SUPABASE_KEY`.

Important:
- Use `service_role` only in backend/server env files.
- Never put `service_role` in `frontend/.env`.

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

Run the SQL in `backend/sql/style_profiles.sql`:

```sql
create table if not exists public.style_profiles (
	user_id text primary key,
	profile jsonb not null default '{}'::jsonb,
	updated_at timestamptz not null default now()
);
```

## API Endpoints

- `POST /rewrite`
	- Input: `{ draft, mode, user_id }`
	- mode: `more_professional` | `sound_smarter` | `fix_grammar`
	- Returns rewritten email using Claude
- `GET /profile/{user_id}`
	- Returns style profile or empty object
- `POST /profile/{user_id}`
	- Upserts style profile JSON

## Deploy

- Frontend (Vercel):
	- Build command: `npm run build`
	- Output directory: `dist`
- Backend (Railway):
	- Start command uses `backend/Procfile`
	- `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
