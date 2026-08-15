#!/usr/bin/env python3

import csv
from pathlib import Path
import matplotlib.pyplot as plt

ROOT = Path(__file__).resolve().parents[1]
RESULTS = ROOT / "benchmark/results"
VISUALS = ROOT / "benchmark/visuals"
VISUALS.mkdir(parents=True, exist_ok=True)
rows = list(csv.DictReader((RESULTS / "summary.csv").open()))
colors = {"sahara":"#E45756", "groq":"#4C78A8", "deepgram":"#72B7B2", "assemblyai":"#F2CF5B"}

def save_bar(field, title, ylabel, filename, scale=1):
    providers = [r["provider"] for r in rows]
    values = [float(r[field]) * scale for r in rows]
    fig, ax = plt.subplots(figsize=(10, 5.625))
    bars = ax.bar(providers, values, color=[colors.get(p, "#999") for p in providers])
    ax.set_title(title, fontsize=18, weight="bold", pad=16); ax.set_ylabel(ylabel); ax.spines[["top","right"]].set_visible(False)
    ax.bar_label(bars, fmt="%.1f", padding=3, fontsize=11)
    fig.tight_layout(); fig.savefig(VISUALS / filename, dpi=200, transparent=False); plt.close(fig)

save_bar("normalized_wer", "Code-switched ASR accuracy", "Normalized WER (%) — lower is better", "normalized-wer.png", 100)
save_bar("median_latency_seconds", "Transcription turnaround", "Median latency (seconds) — lower is better", "latency.png")
save_bar("api_completion_rate", "Benchmark reliability", "Completed requests (%)", "completion-rate.png", 100)
