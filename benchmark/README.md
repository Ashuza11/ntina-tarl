# Speech-to-text benchmark

This harness compares Groq Whisper Large V3, Deepgram Nova-3, AssemblyAI
Universal-2, and Intron Sahara on the same consented Ntina V0 recordings.
It reports raw and text-normalized WER/CER, request completion, and end-to-end
latency. Results are cached as JSONL, so interrupted or slow API runs resume
without repeating paid requests.

The completed full-corpus results and their interpretation are documented in
[`docs/ASR-BENCHMARK.md`](../docs/ASR-BENCHMARK.md). Aggregate machine-readable
metrics are in [`results/summary.csv`](./results/summary.csv).

## Method

The default is a deterministic 24-clip pilot balanced across language,
speaker, set, and content type. This is an engineering comparison, not a
population-level claim: V0 has five speakers and uneven cells. Yoruba tone
marks and subdot letters remain meaningful during normalization.

Deepgram Nova-3 does not currently list Swahili or Yoruba as supported
languages. It is run in multilingual mode to measure fallback behavior, but
its result must not be described as a like-for-like supported-language score.

```bash
node benchmark/run-benchmark.js --limit=24
python3 benchmark/analyze-results.py
python3 benchmark/make-visuals.py
```

Use `--providers=groq,assemblyai` to run selected providers or `--limit=262`
for the full corpus. Credentials are read from the ignored `server/.env`.
Outputs go to `benchmark/results/`; presentation-ready 16:9 PNG charts go to
`benchmark/visuals/`.
