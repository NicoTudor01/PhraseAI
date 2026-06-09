import argparse
import json
from pathlib import Path

from app.main import LearnRequest, update_profile_from_feedback


def run_phase(profile, samples, phase_name):
    for sample in samples:
        # AGENT1: [CHANGE] Keep the simulator aligned with the current LearnRequest schema.
        payload = LearnRequest(**sample)
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
    # AGENT4: [HARDENED] Remove committed developer-machine paths and accept an explicit local fixture.
    parser = argparse.ArgumentParser(description="Simulate PhraseAI style learning with a JSON fixture.")
    parser.add_argument("dataset", type=Path, help="JSON file containing phaseA and phaseB arrays.")
    args = parser.parse_args()
    dataset_path = args.dataset

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
