import json
from pathlib import Path

from app.main import LearnRequest, update_profile_from_feedback


def run_phase(profile, samples, phase_name):
    for sample in samples:
        payload = LearnRequest(**sample, user_id="stress-test-user")
        profile = update_profile_from_feedback(profile, payload)

    stats = profile.get("stats", {})
    preferences = profile.get("preferences", {})
    persona = profile.get("persona", {})
    guidance = profile.get("guidance", [])

    print(f"\n=== {phase_name} ===")
    print(f"learned_examples: {stats.get('learned_examples', 0)}")
    print(f"formality: {persona.get('formality', 'unknown')}")
    print(f"directness: {persona.get('directness', 'unknown')}")
    print(f"energy: {persona.get('energy', 'unknown')}")
    print(f"traits: {persona.get('traits', [])}")
    print("preferences:")
    print(json.dumps(preferences, indent=2))
    print("guidance:")
    print(json.dumps(guidance, indent=2))
    return profile


def main():
    dataset_path = Path(
        r"C:\Users\Nicu\AppData\Roaming\Code\User\workspaceStorage\a3ab1b4301981f2a40ca9a6d9ca4aaa8\GitHub.copilot-chat\chat-session-resources\ecb21e41-616e-4def-9ce1-653f2e825d4d\call_VJaT2ZRmUNGtjWq0gwW570fD__vscode-1780947415259\content.txt"
    )

    raw = dataset_path.read_text(encoding="utf-8").strip()
    if raw.startswith("```json"):
        raw = raw[len("```json"):]
    if raw.endswith("```"):
        raw = raw[:-3]

    data = json.loads(raw.strip())

    profile = {}
    profile = run_phase(profile, data["phaseA"], "After Phase A (formal + concise)")
    profile = run_phase(profile, data["phaseB"], "After Phase B (warmer + conversational)")

    print("\n=== Recent Example Count ===")
    print(len(profile.get("recent_examples", [])))


if __name__ == "__main__":
    main()
