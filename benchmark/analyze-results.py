#!/usr/bin/env python3

import csv, json, math, re, statistics, unicodedata
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RESULTS = ROOT / "benchmark/results"

def edit_distance(a, b):
    prev = list(range(len(b) + 1))
    for i, x in enumerate(a, 1):
        cur = [i]
        for j, y in enumerate(b, 1):
            cur.append(min(cur[-1] + 1, prev[j] + 1, prev[j-1] + (x != y)))
        prev = cur
    return prev[-1]

def normalize(text):
    text = unicodedata.normalize("NFC", text).lower()
    text = re.sub(r"[^\w\s'ẹọṣàáèéìíòóùúńǹ̀́]", " ", text, flags=re.UNICODE)
    return re.sub(r"\s+", " ", text).strip()

def rates(reference, hypothesis, normalized=False):
    if normalized:
        reference, hypothesis = normalize(reference), normalize(hypothesis)
    rw, hw = reference.split(), hypothesis.split()
    return edit_distance(rw, hw) / max(1, len(rw)), edit_distance(list(reference), list(hypothesis)) / max(1, len(reference))

raw_rows = [json.loads(line) for line in (RESULTS / "raw-results.jsonl").read_text().splitlines() if line.strip()]
latest = {}
for row in raw_rows:
    latest[(row["provider"], row["recording_id"])] = row
rows = list(latest.values())
scored = []
for row in rows:
    raw_wer, raw_cer = rates(row["reference"], row.get("transcript", ""))
    norm_wer, norm_cer = rates(row["reference"], row.get("transcript", ""), True)
    # Every clip distributed in Voice V0 has a valid reference transcript.
    # Adult Set B clips are scripted prompt readings; untranscribed child Set B
    # responses were excluded from V0 before this benchmark was run.
    reference_valid = True
    scored.append({**{k: row.get(k, "") for k in ("provider","recording_id","model","language","speaker_id","set","content_type","status","latency_ms","reference","transcript","error")}, "reference_valid": reference_valid,
                   "raw_wer": raw_wer, "raw_cer": raw_cer, "normalized_wer": norm_wer, "normalized_cer": norm_cer})

with (RESULTS / "scored-results.csv").open("w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=scored[0].keys()); writer.writeheader(); writer.writerows(scored)

groups = defaultdict(list)
for row in scored: groups[row["provider"]].append(row)
summary = []
for provider, items in sorted(groups.items()):
    api_ok = [r for r in items if r["status"] == "ok"]
    scored_ok = [r for r in api_ok if r["reference_valid"]]
    summary.append({
        "provider": provider, "attempted": len(items), "api_completed": len(api_ok),
        "api_completion_rate": len(api_ok)/len(items), "scored": len(scored_ok),
        "excluded_invalid_reference": len(api_ok) - len(scored_ok),
        "normalized_wer": statistics.mean(r["normalized_wer"] for r in scored_ok) if scored_ok else math.nan,
        "normalized_cer": statistics.mean(r["normalized_cer"] for r in scored_ok) if scored_ok else math.nan,
        "median_latency_seconds": statistics.median(r["latency_ms"] for r in api_ok)/1000 if api_ok else math.nan,
    })
with (RESULTS / "summary.csv").open("w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=summary[0].keys()); writer.writeheader(); writer.writerows(summary)
print(json.dumps(summary, indent=2))
