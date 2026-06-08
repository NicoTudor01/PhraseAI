import os
import json
import re
from datetime import datetime, timezone
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


class LearnRequest(BaseModel):
    user_id: str = Field(min_length=1)
    mode: Literal["more_professional", "sound_smarter", "fix_grammar"]
    draft: str = Field(min_length=1)
    ai_output: str = Field(min_length=1)
    final_version: str = Field(min_length=1)


class StressTestRequest(BaseModel):
    user_id: str = Field(min_length=1)
    samples_per_phase: int = Field(default=15, ge=3, le=50)


app = FastAPI(title="PhraseAI API", version="0.1.0")

frontend_origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
allowed_origins = [origin.strip() for origin in frontend_origin.split(",") if origin.strip()]
if "http://localhost:5173" not in allowed_origins:
    allowed_origins.append("http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
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


def get_profile_for_user(user_id: str) -> dict:
    supabase = get_supabase()
    result = (
        supabase.table("style_profiles")
        .select("profile")
        .eq("user_id", user_id)
        .execute()
    )

    rows = result.data or []
    if rows and isinstance(rows[0], dict):
        return rows[0].get("profile", {}) or {}
    return {}


def safe_get_profile_for_user(user_id: str) -> dict:
    try:
        return get_profile_for_user(user_id)
    except Exception:
        # Rewrite should still function even when profile storage is unavailable.
        return {}


def _count_sentences(text: str) -> int:
    parts = [chunk.strip() for chunk in re.split(r"[.!?]+", text) if chunk.strip()]
    return max(1, len(parts))


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def _append_limited(items: list, value: dict, max_items: int) -> list:
    next_items = [value, *items]
    return next_items[:max_items]


def _strip_excerpt(text: str, max_len: int = 220) -> str:
    return text.strip().replace("\n", " ")[:max_len]


def extract_style_signals(final_version: str) -> dict:
    words = re.findall(r"\b\w+\b", final_version)
    word_count = len(words)
    sentence_count = _count_sentences(final_version)
    contractions = re.findall(
        r"\b(?:I'm|I've|I'll|I'd|you're|you've|you'll|you'd|we're|we've|we'll|we'd|they're|they've|they'll|they'd|it's|that's|there's|can't|won't|don't|didn't|isn't|aren't|wasn't|weren't|shouldn't|couldn't|wouldn't|let's|here's|what's|who's)\b",
        final_version,
        flags=re.IGNORECASE,
    )
    exclamation_count = final_version.count("!")
    question_count = final_version.count("?")

    lower = final_version.lower()
    greeting = "none"
    if any(token in lower for token in ["hi ", "hello", "dear ", "hey "]):
        greeting = "used"

    signoff = "none"
    if any(
        token in lower
        for token in ["best regards", "kind regards", "regards", "thanks", "thank you", "sincerely", "best,"]
    ):
        signoff = "used"

    contraction_ratio = (len(contractions) / word_count) if word_count else 0.0

    return {
        "word_count": word_count,
        "sentence_count": sentence_count,
        "avg_sentence_length": (word_count / sentence_count) if sentence_count else 0,
        "contraction_ratio": _clamp(contraction_ratio, 0.0, 1.0),
        "exclamation_count": exclamation_count,
        "question_count": question_count,
        "uses_greeting": greeting,
        "uses_signoff": signoff,
    }


def update_profile_from_feedback(existing: dict, payload: LearnRequest) -> dict:
    profile = dict(existing or {})

    stats = dict(profile.get("stats") or {})
    learned_examples = int(stats.get("learned_examples") or 0) + 1
    stats["learned_examples"] = learned_examples
    stats["last_mode"] = payload.mode
    stats["last_learned_at"] = datetime.now(timezone.utc).isoformat()

    current = dict(profile.get("preferences") or {})
    signals = extract_style_signals(payload.final_version)

    old_avg_sentence = float(current.get("avg_sentence_length") or signals["avg_sentence_length"])
    old_contraction_ratio = float(current.get("contraction_ratio") or signals["contraction_ratio"])
    old_exclamations = float(current.get("avg_exclamation_count") or signals["exclamation_count"])

    # Smooth updates to avoid overfitting to a single sample.
    alpha = 0.3
    current["avg_sentence_length"] = round((1 - alpha) * old_avg_sentence + alpha * signals["avg_sentence_length"], 2)
    current["contraction_ratio"] = round((1 - alpha) * old_contraction_ratio + alpha * signals["contraction_ratio"], 3)
    current["avg_exclamation_count"] = round((1 - alpha) * old_exclamations + alpha * signals["exclamation_count"], 2)
    current["prefers_greeting"] = signals["uses_greeting"]
    current["prefers_signoff"] = signals["uses_signoff"]

    if current["contraction_ratio"] >= 0.04:
        formality = "conversational"
    elif current["contraction_ratio"] <= 0.015:
        formality = "formal"
    else:
        formality = "balanced"

    if current["avg_sentence_length"] >= 18:
        directness = "detailed"
    elif current["avg_sentence_length"] <= 12:
        directness = "concise"
    else:
        directness = "balanced"

    if current["avg_exclamation_count"] >= 1:
        energy = "high"
    elif current["avg_exclamation_count"] >= 0.25:
        energy = "warm"
    else:
        energy = "calm"

    persona_traits = []
    if current["prefers_greeting"] == "used":
        persona_traits.append("uses greetings")
    if current["prefers_signoff"] == "used":
        persona_traits.append("uses sign-offs")
    if not persona_traits:
        persona_traits.append("minimal openings/closings")

    persona = {
        "formality": formality,
        "directness": directness,
        "energy": energy,
        "traits": persona_traits,
    }

    guidance = []
    if current["prefers_greeting"] == "used":
        guidance.append("Start with a greeting when it fits the context.")
    if current["prefers_signoff"] == "used":
        guidance.append("End with a friendly sign-off.")
    if current["contraction_ratio"] >= 0.03:
        guidance.append("Use occasional contractions to keep a natural tone.")
    else:
        guidance.append("Favor a formal style with minimal contractions.")

    if current["avg_sentence_length"] >= 18:
        guidance.append("Use fuller, detailed sentences.")
    else:
        guidance.append("Keep sentences concise and direct.")

    recent_examples = list(profile.get("recent_examples") or [])
    history_entry = {
        "learned_at": stats["last_learned_at"],
        "mode": payload.mode,
        "draft_excerpt": payload.draft.strip()[:220],
        "ai_excerpt": payload.ai_output.strip()[:220],
        "final_excerpt": payload.final_version.strip()[:220],
    }

    profile["stats"] = stats
    profile["preferences"] = current
    profile["persona"] = persona
    profile["guidance"] = guidance
    profile["recent_examples"] = _append_limited(recent_examples, history_entry, max_items=20)
    return profile


def log_learning_event(
    supabase: Client,
    payload: LearnRequest,
    *,
    source: str,
    signals: dict,
    persona: dict,
) -> None:
    try:
        (
            supabase.table("learning_events")
            .insert(
                {
                    "user_id": payload.user_id,
                    "mode": payload.mode,
                    "draft": payload.draft,
                    "ai_output": payload.ai_output,
                    "final_version": payload.final_version,
                    "source": source,
                    "signals": signals,
                    "persona_snapshot": persona,
                }
            )
            .execute()
        )
    except Exception:
        # Do not fail user flows if logging table is not created yet.
        return


def make_stress_payloads(user_id: str, samples_per_phase: int) -> list[LearnRequest]:
    phase_a = [
        {
            "mode": "more_professional",
            "draft": "hey just checking in about the report progress",
            "ai_output": "I am checking in regarding report progress.",
            "final_version": "I am writing to confirm report progress. Please share the latest status. Regards.",
        },
        {
            "mode": "sound_smarter",
            "draft": "we can make this process better",
            "ai_output": "We can improve this process.",
            "final_version": "We can improve this process through tighter execution and clear ownership. Best regards.",
        },
        {
            "mode": "fix_grammar",
            "draft": "the budget were approved and we can start",
            "ai_output": "The budget was approved and we can begin.",
            "final_version": "The budget was approved, and we can begin implementation immediately. Respectfully.",
        },
    ]

    phase_b = [
        {
            "mode": "more_professional",
            "draft": "hi team, can we sync tomorrow?",
            "ai_output": "Team, can we meet tomorrow?",
            "final_version": "Hi team, can we sync tomorrow to align on next steps? Thanks!",
        },
        {
            "mode": "sound_smarter",
            "draft": "we should use what we learned next time",
            "ai_output": "We should use these learnings next time.",
            "final_version": "We should use what we've learned to improve the next rollout. Cheers!",
        },
        {
            "mode": "fix_grammar",
            "draft": "the results is good and we are happy",
            "ai_output": "The results are good and we are pleased.",
            "final_version": "The results are strong, and we're really happy with the outcome! Talk soon!",
        },
    ]

    payloads: list[LearnRequest] = []
    for idx in range(samples_per_phase):
        base = phase_a[idx % len(phase_a)]
        payloads.append(LearnRequest(user_id=user_id, **base))

    for idx in range(samples_per_phase):
        base = phase_b[idx % len(phase_b)]
        payloads.append(LearnRequest(user_id=user_id, **base))

    return payloads


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/rewrite", response_model=RewriteResponse)
def rewrite_email(payload: RewriteRequest) -> RewriteResponse:
    model_name = os.getenv("LLM_MODEL", "claude-sonnet-4-20250514")
    max_tokens = int(os.getenv("LLM_MAX_TOKENS", "1200"))

    style_profile = safe_get_profile_for_user(payload.user_id)
    style_guidance = style_profile.get("guidance") or []
    guidance_text = "\n".join(f"- {line}" for line in style_guidance[:6])
    guidance_block = (
        f"\nPersonalized writing preferences learned from prior edits:\n{guidance_text}\n"
        if guidance_text
        else "\nNo personalized writing preferences have been learned yet.\n"
    )

    context_block = ""
    if payload.context and payload.context.strip():
        context_block = f"\n\nAdditional context provided by user:\n{payload.context.strip()}"

    prompt = (
        "Rewrite the following email draft.\n\n"
        f"Mode: {payload.mode}\n"
        f"Instruction: {mode_instruction(payload.mode)}\n"
        f"User ID: {payload.user_id}\n"
        f"Style profile snapshot: {json.dumps(style_profile)[:1200]}\n"
        f"{guidance_block}\n"
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
    try:
        profile = get_profile_for_user(user_id)
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


@app.post("/learn")
def learn_from_user_edit(payload: LearnRequest) -> dict:
    supabase = get_supabase()

    try:
        current_profile = get_profile_for_user(payload.user_id)
        next_profile = update_profile_from_feedback(current_profile, payload)
        signals = extract_style_signals(payload.final_version)
        persona = next_profile.get("persona") or {}

        (
            supabase.table("style_profiles")
            .upsert({"user_id": payload.user_id, "profile": next_profile}, on_conflict="user_id")
            .execute()
        )

        log_learning_event(
            supabase,
            payload,
            source="manual",
            signals=signals,
            persona=persona,
        )

        return {
            "status": "ok",
            "user_id": payload.user_id,
            "profile": next_profile,
            "learned_examples": (next_profile.get("stats") or {}).get("learned_examples", 0),
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Learning update failed: {exc}") from exc


@app.post("/dev/stress-test")
def run_stress_test(payload: StressTestRequest) -> dict:
    supabase = get_supabase()
    samples = make_stress_payloads(payload.user_id, payload.samples_per_phase)

    try:
        profile = get_profile_for_user(payload.user_id)
        for sample in samples:
            profile = update_profile_from_feedback(profile, sample)
            log_learning_event(
                supabase,
                sample,
                source="stress_test",
                signals=extract_style_signals(sample.final_version),
                persona=profile.get("persona") or {},
            )

        (
            supabase.table("style_profiles")
            .upsert({"user_id": payload.user_id, "profile": profile}, on_conflict="user_id")
            .execute()
        )

        return {
            "status": "ok",
            "user_id": payload.user_id,
            "processed_samples": len(samples),
            "profile": profile,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Stress test failed: {exc}") from exc


@app.get("/learning-events/{user_id}")
def get_learning_events(user_id: str, limit: int = 30) -> dict:
    supabase = get_supabase()
    safe_limit = max(1, min(limit, 200))

    try:
        result = (
            supabase.table("learning_events")
            .select("id,user_id,mode,source,final_version,signals,persona_snapshot,created_at")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(safe_limit)
            .execute()
        )
        rows = result.data or []
        events = [
            {
                "id": row.get("id"),
                "mode": row.get("mode"),
                "source": row.get("source"),
                "created_at": row.get("created_at"),
                "final_excerpt": _strip_excerpt(row.get("final_version") or ""),
                "signals": row.get("signals") or {},
                "persona_snapshot": row.get("persona_snapshot") or {},
            }
            for row in rows
        ]
        return {"user_id": user_id, "events": events}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Learning events fetch failed: {exc}") from exc
