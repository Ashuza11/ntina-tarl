# ASR benchmark results

## Scope

Ntina benchmarked Intron Sahara, Groq Whisper Large V3, AssemblyAI, and
Deepgram on the same 262 consented Voice Dataset V0 clips. The corpus contains
about 22 minutes and 55 seconds of Standard Kiswahili, Standard Yoruba, and
their English scaffolding. Results are an engineering comparison over five
speakers, not a population-level language benchmark.

The harness records request status and end-to-end latency, retains resumable
JSONL responses, and calculates Unicode-aware raw and normalized word and
character error rates. Yoruba tone marks and subdot letters remain meaningful
during normalization.

## Aggregate results

| Provider | API completed | Reliability | Normalized WER | Normalized CER | Median latency |
|---|---:|---:|---:|---:|---:|
| Sahara | 258/262 | 98.5% | **77.9%** | **58.8%** | 3.40 s |
| Groq Whisper Large V3 | 262/262 | 100% | 88.3% | 64.9% | 3.18 s |
| AssemblyAI | 262/262 | 100% | 88.9% | 69.9% | 4.59 s |
| Deepgram Nova-3 multilingual | 262/262 | 100% | 100.4% | 74.3% | **1.89 s** |

Lower WER, CER, and latency are better. WER can exceed 100% when a hypothesis
contains enough insertions. The corpus contains many isolated syllables and
single words, so one substitution can also produce 100% WER for an entire
clip. Aggregate results must therefore be read alongside results by language,
speaker, and content type before making broader claims.

Sahara achieved the lowest aggregate error rates, while Deepgram returned the
lowest median latency. Deepgram Nova-3 does not currently list Swahili or
Yoruba as supported languages; its multilingual-mode result is exploratory,
not a like-for-like supported-language comparison.

## Reliability findings

Groq initially returned 119 rate-limit errors. Retrying only failed clips with
`Retry-After`-aware backoff produced transcripts for all 262 clips. The final
100% completion figure therefore includes controlled retries and is not a
first-attempt success rate.

Sahara completed 258 clips. It rejected four short Yoruba syllable clips—
`yo-ls-010`, `yo-ls-011`, `yo-ls-021`, and `yo-ls-030`—because the service
reported their duration as zero seconds and requires at least one second.
They were not padded or otherwise changed because every provider must receive
the same benchmark audio.

All distributed V0 clips have valid reference transcripts. Adult Set B clips
are scripted readings of their prompts; the untranscribed child Set B
responses were excluded from Voice Dataset V0 before benchmarking.

## Reproduction and artifacts

```bash
node benchmark/run-benchmark.js --limit=262
node benchmark/refresh-sahara.js
python3 benchmark/analyze-results.py
python3 benchmark/make-visuals.py
```

- `benchmark/results/summary.csv` — aggregate metrics
- `benchmark/results/scored-results.csv` — per-provider, per-clip scores
- `benchmark/results/raw-results.jsonl` — local, gitignored API cache and retry history
- `benchmark/visuals/` — presentation-ready WER, latency, and reliability charts

API keys are read from the ignored `server/.env` file and are not stored in
benchmark artifacts.
