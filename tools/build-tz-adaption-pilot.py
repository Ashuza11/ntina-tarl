#!/usr/bin/env python3
"""Build the controlled 50-row Tanzanian Kiswahili Adaptive Data pilot."""

from __future__ import annotations

import csv
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "data" / "adaption" / "sw-en_tz-sanifu-pilot-50.csv"

CATEGORY_QUOTAS = {
    "instruction": 8,
    "praise": 8,
    "hint": 7,
    "correction": 6,
    "level_transition": 6,
    "encouragement": 5,
    "closing": 3,
    "repair": 3,
    "escalation": 2,
    "facilitator": 2,
}

# Exact policy totals: none=15, familiar_cue=20, technical_term=10,
# natural_only=5. Assignment is explicit so rebuilds remain stable.
NONE = {
    "instr-comprehension-001",
    "praise-first-try-beginner-001",
    "praise-comprehension-001",
    "hint-letter-sound-001",
    "hint-word-first-letter-001",
    "hint-comprehension-001",
    "correction-syllable-soft-001",
    "correction-word-soft-001",
    "correction-sentence-soft-001",
    "correction-comprehension-001",
    "level-up-beginner-to-letter-001",
    "level-up-letter-to-word-001",
    "encourage-hard-item-001",
    "closing-session-complete-001",
    "repair-too-quiet-001",
}

TECHNICAL = {
    "instr-start-beginner-001",
    "instr-start-letter-syllable-001",
    "instr-start-paragraph-001",
    "instr-start-story-001",
    "hint-syllable-blend-001",
    "hint-sentence-context-001",
    "correction-model-pronunciation-001",
    "repair-background-noise-001",
    "facilitator-confirm-level-001",
    "facilitator-session-summary-001",
}

NATURAL_ONLY = {
    "instr-slow-down-001",
    "praise-first-try-story-001",
    "level-up-word-to-paragraph-001",
    "escalate-call-facilitator-001",
    "escalate-technical-fault-001",
}

TECHNICAL_TERM = {
    "instr-start-beginner-001": "sound",
    "instr-start-letter-syllable-001": "syllable",
    "instr-start-paragraph-001": "paragraph",
    "instr-start-story-001": "story",
    "hint-syllable-blend-001": "blend",
    "hint-sentence-context-001": "clue",
    "correction-model-pronunciation-001": "repeat after me",
    "repair-background-noise-001": "noise",
    "facilitator-confirm-level-001": "level",
    "facilitator-session-summary-001": "session",
}

LITERAL_TARGETS = {
    "correction-letter-soft-001": "mmm",
    "correction-syllable-soft-001": "si; su",
    "correction-model-pronunciation-001": "shule",
}

FIELDS = [
    "act_id",
    "prompt",
    "completion",
    "category",
    "tarl_level",
    "audience",
    "max_words",
    "country",
    "curriculum_register",
    "literacy_skill",
    "code_switch_policy",
    "allowed_english_term",
    "literal_target",
]


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def select_acts(rows: list[dict[str, str]]) -> list[dict[str, str]]:
    selected = []
    counts = {key: 0 for key in CATEGORY_QUOTAS}
    for row in rows:
        category = row["category"]
        if category in CATEGORY_QUOTAS and counts[category] < CATEGORY_QUOTAS[category]:
            selected.append(row)
            counts[category] += 1
    assert len(selected) == 50
    assert counts == CATEGORY_QUOTAS
    return selected


def policy(act_id: str) -> str:
    if act_id in NONE:
        return "none"
    if act_id in TECHNICAL:
        return "technical_term"
    if act_id in NATURAL_ONLY:
        return "natural_only"
    return "familiar_cue"


def literacy_skill(row: dict[str, str]) -> str:
    level = row["tarl_level"]
    if level == "beginner":
        return "letter_sound_recognition"
    if level == "letter_syllable":
        return "syllable_recognition_and_blending"
    if level == "word":
        return "word_reading"
    if level == "paragraph":
        return "paragraph_reading_and_fluency"
    if level == "story":
        return "story_reading_and_comprehension"
    return "cross_level_session_support"


def main() -> None:
    acts = select_acts(read_csv(ROOT / "data" / "spec" / "dialogue-acts.csv"))
    source_rows = {
        row["act_id"]: row
        for row in read_csv(ROOT / "data" / "scaffolding" / "sw-en.csv")
    }

    output_rows = []
    for act in acts:
        source = source_rows[act["act_id"]]
        source_text = (
            source["corrected_text"].strip()
            if source["verdict"].strip() == "fix"
            else source["text_draft"].strip()
        )
        if not source_text:
            raise ValueError(f"Missing reviewed completion: {act['act_id']}")
        output_rows.append(
            {
                "act_id": act["act_id"],
                "prompt": act["function"],
                "completion": source_text,
                "category": act["category"],
                "tarl_level": act["tarl_level"],
                "audience": act["audience"],
                "max_words": act["max_words"],
                "country": "Tanzania",
                "curriculum_register": "Tanzanian primary education; Kiswahili Sanifu",
                "literacy_skill": literacy_skill(act),
                "code_switch_policy": policy(act["act_id"]),
                "allowed_english_term": TECHNICAL_TERM.get(act["act_id"], ""),
                "literal_target": LITERAL_TARGETS.get(act["act_id"], ""),
            }
        )

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDS, lineterminator="\n")
        writer.writeheader()
        writer.writerows(output_rows)
    print(OUTPUT.relative_to(ROOT))


if __name__ == "__main__":
    main()
