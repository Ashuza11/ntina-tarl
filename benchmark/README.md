# Benchmark

Multi-model STT comparison harness — required to compare Sahara against at
least two other speech models on code-switched audio, same requirement the
previous hackathon project had to satisfy.

Not built yet — structure first. When built, this should reuse the lesson
(not the code) from the earlier Python harness: report both raw and
text-normalized WER/CER, since raw WER is dominated by formatting
differences between engines rather than real transcription errors. See
`docs/API-FINDINGS.md` for the full benchmark results that harness produced.

Benchmark audio and its metadata live in `data/recordings/`, not here — this
folder is the harness code and its output (results/report), not the corpus.
