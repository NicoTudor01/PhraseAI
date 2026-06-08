import os
import json
from urllib import error as urllib_error
from urllib import request as urllib_request
from typing import Literal

from anthropic import Anthropic
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from supabase import Client, create_client

load_dotenv()


class RewriteRequest(BaseModel):
    draft: str = Field(min_length=1)
    mode: Literal["more_professional", "sound_smarter", "fix_grammar"]
    user_id: str = Field(min_length=1)
    context: str | None = None


class RewriteResponse(BaseModel):
    rewritten: str


class ProfileRequest(BaseModel):
    profile: dict


app = FastAPI(title="PhraseAI API", version="0.1.0")

frontend_origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_supabase() -> Client:
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")

    if not supabase_url or not supabase_key:
        raise HTTPException(
            status_code=500,
            detail="Missing SUPABASE_URL or SUPABASE_KEY environment variables.",
        )

    return create_client(supabase_url, supabase_key)


def get_anthropic() -> Anthropic:
    api_key = os.getenv("ANTHROPIC_API_KEY")
    base_url = os.getenv("ANTHROPIC_BASE_URL")

    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="Missing ANTHROPIC_API_KEY environment variable.",
        )

    client_kwargs = {"api_key": api_key}
    if base_url:
        client_kwargs["base_url"] = base_url

    return Anthropic(**client_kwargs)


def call_openrouter(prompt: str, model_name: str, max_tokens: int) -> str:
    base_url = os.getenv("ANTHROPIC_BASE_URL", "https://openrouter.ai/api/v1").rstrip("/")
    endpoint = f"{base_url}/chat/completions"
    api_key = os.getenv("ANTHROPIC_API_KEY")

    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="Missing ANTHROPIC_API_KEY environment variable.",
        )

    payload = {
        "model": model_name,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": max_tokens,
        "temperature": 0.4,
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    frontend_origin = os.getenv("FRONTEND_ORIGIN")
    if frontend_origin:
        headers["HTTP-Referer"] = frontend_origin
        headers["X-OpenRouter-Title"] = "PhraseAI"

    request = urllib_request.Request(
        endpoint,
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST",
    )

    try:
        with urllib_request.urlopen(request, timeout=60) as response:
            data = json.loads(response.read().decode("utf-8"))
    except urllib_error.HTTPError as exc:
        error_body = exc.read().decode("utf-8", errors="replace")
        raise HTTPException(
            status_code=500,
            detail=f"Rewrite failed: {error_body or exc.reason}",
        ) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Rewrite failed: {exc}") from exc

    choices = data.get("choices") or []
    if not choices:
        raise HTTPException(status_code=502, detail="AI provider returned empty output.")

    message = choices[0].get("message") or {}
    content = message.get("content")
    if isinstance(content, list):
        content = "".join(block.get("text", "") for block in content if isinstance(block, dict))

    if not isinstance(content, str) or not content.strip():
        raise HTTPException(status_code=502, detail="AI provider returned empty output.")

    return content.strip()


def mode_instruction(mode: str) -> str:
    mode_map = {
        "more_professional": "Rewrite the draft to sound more professional and polished while preserving intent.",
        "sound_smarter": "Rewrite the draft to sound sharper, clearer, and more insightful while preserving intent.",
        "fix_grammar": "Fix grammar, punctuation, and clarity while preserving tone and structure.",
    }
    return mode_map[mode]


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/rewrite", response_model=RewriteResponse)
def rewrite_email(payload: RewriteRequest) -> RewriteResponse:
    model_name = os.getenv("LLM_MODEL", "claude-sonnet-4-20250514")
    max_tokens = int(os.getenv("LLM_MAX_TOKENS", "1200"))

    # Placeholder: style profile will be injected here in a later iteration.
    style_profile = {}

    context_block = ""
    if payload.context and payload.context.strip():
        context_block = f"\n\nAdditional context provided by user:\n{payload.context.strip()}"

    prompt = (
        "Rewrite the following email draft.\n\n"
        f"Mode: {payload.mode}\n"
        f"Instruction: {mode_instruction(payload.mode)}\n"
        f"User ID: {payload.user_id}\n"
        f"Style profile (currently placeholder): {style_profile}\n\n"
        f"{context_block}\n\n"
        "Return only the rewritten email text.\n\n"
        f"Draft:\n{payload.draft}"
    )

    base_url = os.getenv("ANTHROPIC_BASE_URL", "").lower()

    if "openrouter.ai" in base_url:
        rewritten = call_openrouter(prompt, model_name, max_tokens)
        return RewriteResponse(rewritten=rewritten)

    client = get_anthropic()

    try:
        message = client.messages.create(
            model=model_name,
            max_tokens=max_tokens,
            temperature=0.4,
            system=(
                "You are an expert email rewriting assistant. "
                "Keep the user's intent intact, produce clean and concise output, "
                "and never add explanations unless asked."
            ),
            messages=[{"role": "user", "content": prompt}],
        )

        rewritten = ""
        for block in message.content:
            if getattr(block, "type", "") == "text":
                rewritten += block.text

        if not rewritten.strip():
            raise HTTPException(status_code=502, detail="AI provider returned empty output.")

        return RewriteResponse(rewritten=rewritten.strip())
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Rewrite failed: {exc}") from exc


@app.get("/profile/{user_id}")
def get_profile(user_id: str) -> dict:
    supabase = get_supabase()

    try:
        result = (
            supabase.table("style_profiles")
            .select("profile")
            .eq("user_id", user_id)
            .execute()
        )

        rows = result.data or []
        profile = {}
        if rows and isinstance(rows[0], dict):
            profile = rows[0].get("profile", {}) or {}

        return {"user_id": user_id, "profile": profile}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Profile fetch failed: {exc}") from exc


@app.post("/profile/{user_id}")
def upsert_profile(user_id: str, payload: ProfileRequest) -> dict:
    supabase = get_supabase()

    try:
        (
            supabase.table("style_profiles")
            .upsert({"user_id": user_id, "profile": payload.profile}, on_conflict="user_id")
            .execute()
        )
        return {"status": "ok", "user_id": user_id, "profile": payload.profile}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Profile upsert failed: {exc}") from exc
