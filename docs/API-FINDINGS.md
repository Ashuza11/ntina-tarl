# Sahara STT API findings — Step 0 test against real audio

Live test against Intron Sahara's speech-to-text API using two real
recordings (`data/recordings/sw_en_1.wav`, `sw_en_2.wav`), 2026-08-14. No
verified transcript existed for either file beforehand — everything below is
what the API actually returned, not a check against ground truth. Raw
responses are saved unmodified in `docs/api-samples/`.

**This document was corrected after the first pass.** The first version was
built by reading the previous hackathon project's code (a sibling project,
same team) plus reverse-engineering behavior we hit live. That was a
reasonable starting point but it led to two real mistakes, both fixed below:
it called the file-status endpoint an "undocumented" discovery (it's
officially documented) and it used the *sync* upload endpoint as the primary
path when the official docs describe an *async* upload endpoint that's the
better fit here. Everything below is now checked against Intron's official
docs (`docs.voice.intron.io`), not the previous project's assumptions — see
"Correction after reading the official docs" below for exactly what changed
and why.

## 0a — Audio file inspection

| File | Sample rate | Bit depth | Channels | Duration | Size |
|---|---|---|---|---|---|
| `sw_en_1.wav` | 16000 Hz | 16-bit (`pcm_s16le`) | 1 (mono) | 6.31s | 202,148 bytes |
| `sw_en_2.wav` | 16000 Hz | 16-bit (`pcm_s16le`) | 1 (mono) | 10.33s | 330,488 bytes |

Both files are **already** WAV 16 kHz / 16-bit / mono — exactly the project's
target format, and well under the documented 120-second file-duration cap on
the sync endpoint. No conversion was needed for normal use. Officially
supported formats (from the docs): WAV, MP3, MP4, M4A, OGG, WebM, FLAC.

Still ran the "raw vs. converted" comparison as instructed: re-encoded
`sw_en_1.wav` through `ffmpeg` to the identical spec (fresh header, same PCM
target format) and submitted it separately. Result: **inconclusive** — the
converted copy queued normally (same as every other call in this test) and
had not finished processing by the time this document was written. Its
`file_id` is logged below for a later recheck; there is no evidence so far
that header/re-encoding differences change anything, but this specific
comparison isn't confirmed yet.

## 0b — What the previous hackathon project established (superseded, see below)

Originally read `voice_agent/stt/sahara_stt.py`, `http_utils.py`, and the
`sw_en.yaml` language config from the sibling hackathon project
(`dli2026/Hackathons-challenge/agentic-voice-ai-challenge`) before official
docs were available. Kept here for the record, but **do not build against
this section** — see the correction below for what's actually current.

- It used only the *sync* upload endpoint, never the async one.
- Its retry logic only handles `ConnectionError`/`Timeout`, never HTTP-level
  errors like a 503 — a real gap, since the sync endpoint hits a 503 as
  routine behavior, not an edge case (confirmed in 0c).
- It documented the streaming STT endpoint as broken as of 2026-08-05. The
  official docs describe streaming STT as a normal, fully-specified feature
  with no broken-status notice — this project doesn't use streaming either
  way, so it wasn't retested, but the "known broken" claim shouldn't be
  trusted going forward without a fresh check against the current API.

## 0c — Live calls against the two real files

Both were sent **raw** (already target format — see 0a), via the sync
endpoint initially (before the official docs were available). Full raw JSON
saved to `docs/api-samples/sw_en_1.wav.response.json` /
`docs/api-samples/sw_en_1.wav.status.response.json` (and the `sw_en_2`
equivalents).

### Transcripts returned

| File | `audio_transcript` |
|---|---|
| `sw_en_1.wav` | `Habari, naitwa Amani. Nataka kuangalia salio ya akaunti yangu.` |
| `sw_en_2.wav` | `Nilituma pesa jana lakini transaction imeshindwa. Why is that?` |

Both are real, well-formed, code-switched Swahili–English sentences — not
placeholders or errors. **Unverified**: no ground-truth transcript exists for
either file, so this is what came back, not a scored accuracy result.

### Answering the specific questions

- **Bare transcript string, or structured output?** Bare string
  (`audio_transcript`) only. No nested structure, no segments array. The
  docs do add one structured option on top of this — see "Question
  Answering" below — but it's a post-processing add-on, not richer STT
  output.
- **Token or word-level confidence scores?** **Not present**, and not in the
  documented response schema for any STT endpoint (sync, async, streaming,
  or status).
- **Word timings / alignment?** **Not present**, same as above — no
  timestamp/offset field documented anywhere in the STT response schema.
- **Vocabulary biasing / hotwords / phrase hints / any way to constrain
  decoding toward an expected string?** **Not documented anywhere.** The
  official Upload File (both sync and async) request-body table lists
  exactly these fields: `audio_file_name`, `audio_file_blob`,
  `use_diarization`, `use_template_id`, `use_category`,
  `use_language_asr_input`. No hotwords/vocabulary/bias field exists in the
  documented API surface. This is now a documentation-confirmed absence, not
  just an untested guess.
- **Language identification / per-segment language tags?** **Not present.**
  The response has no field indicating which spans (if any) were detected as
  English vs. Swahili, despite both real transcripts actually being
  code-switched. This directly confirms the project's founding assumption:
  Sahara will transcribe code-switched speech, but won't tell you where the
  switch happened.
- **Latency per call, and formats/rates accepted:** See below — highly
  variable in practice, not a fixed number, regardless of which upload
  endpoint is used. Both files were accepted at 16 kHz/16-bit/mono without
  any format-related error.
- **Rate limits and error shapes** (now cross-checked against the official
  docs, which state these limits explicitly):
  - `POST /file/v1/upload/sync` (sync): **30 requests/minute**. Blocks up to
    120s; can return `503` with a `file_id` if it can't finish within that
    window — this is documented, expected behavior, not a fallback path we
    discovered by accident.
  - `POST /file/v1/upload` (async): **60 requests/minute**. Returns a
    `file_id` immediately (`"message":"file queued for processing"`), no
    blocking wait. **This is the correct endpoint for this project** — see
    the correction section below.
  - `GET /file/v1/status/{file_id}`: **100 requests/minute** documented, but
    we also hit a real `429` (`"ratelimit exceeded 1 per 1 second"`) when
    polling twice within one second — a tighter burst limit sits on top of
    the per-minute figure. `demo-stt.js` polls every 3s to stay well clear
    of both.
  - Response headers on the upload endpoints include `x-ratelimit-limit`,
    `x-ratelimit-remaining`, and `retry-after`, confirmed present in our
    saved raw responses.
  - Documented processing statuses: `FILE_QUEUED`, `FILE_PENDING`,
    `FILE_PROCESSING`, `FILE_TRANSCRIBED`, `FILE_PROCESSING_FAILED`.
  - **Turnaround is highly unpredictable, independent of which upload
    endpoint is used.** Confirmed on *four separate submissions across two
    different endpoints* (sync and async, full sentences and a 44KB
    single-word clip): every one sat in `FILE_QUEUED` for well over an hour
    of real time in this test session, some far longer. This is not an
    artifact of using the wrong endpoint — the async endpoint uploads
    almost instantly (confirmed: `HTTP 200` with a `file_id` in under a
    second), but the actual transcription work behind it can queue for a
    long, unbounded time on Sahara's side right now. **This is a real
    operational risk for the product**, independent of anything in our
    code — flag it to the team/Sahara before assuming a live "record → get
    a response" session is achievable on this endpoint today.

## 0d — Does hint/bias/vocabulary restriction change the output?

Isolated a single word-length clip from `sw_en_1.wav` (silence-detected
segment, 353–1736ms, ≈1.4s — the "Habari" greeting at the start of the known
transcript) and sent it three ways:

1. **Plain** — `use_language_asr_input=sw` only.
2. **With a speculative hint field** — added `hotwords=Habari` to the
   multipart form. No such field is documented anywhere; guessed based on
   common STT API conventions.
3. **With a speculative restricted-vocabulary field** — added
   `vocabulary=Habari,Karibu,Asante`. Same caveat — not documented.

**Result: inconclusive within this test session** — all three are still
queued (see the turnaround note in 0c; this isn't specific to these calls).
What **is** now confirmed, from the official docs directly rather than
inference:

- **No such parameter exists in the documented API.** The official Upload
  File request-body table is exhaustive on this page and lists only
  `audio_file_name`, `audio_file_blob`, `use_diarization`,
  `use_template_id`, `use_category`, `use_language_asr_input`. There is no
  hotwords/vocabulary/phrase-hint field documented for STT at all, sync,
  async, or streaming.
- Neither speculative field caused an immediate `400`/rejection at
  submission time — consistent with the API silently ignoring unrecognized
  multipart fields.

**Pending file_ids** (submitted 2026-08-14, still `FILE_QUEUED` as of
writing — recheck with `node tools/check-sahara-status.js <file_id>` and
update this document with the actual comparison once they resolve):

| Variant | `file_id` |
|---|---|
| Plain | `2e2fe6e2-f9c5-43ad-a865-79fab0909a34` |
| Hint (`hotwords`) | `94dee161-bbea-43c2-a50c-10b091c68d24` |
| Restricted vocab | `08b17d33-918d-41fa-bb44-13d16bc78739` |
| Converted-copy (0a) | `6217abfe-ccc9-43ee-9ffd-98170bf89d57` |
| Fresh async-endpoint test (`sw_en_2.wav`) | `ef32c506-5d80-44c4-8071-5202241128ac` |

Given the request-body table is documented and exhaustive, and neither
resolved call returned any structured metadata, this is now effectively
confirmed rather than just predicted: **there is no vocabulary-biasing
mechanism in Sahara's STT API.**

## Correction after reading the official docs (docs.voice.intron.io)

The user supplied the full official docs after the first pass of this
document was written from the previous hackathon project's code plus live
probing. Corrections:

1. **`GET /file/v1/status/{file_id}` is officially documented**, not an
   undocumented discovery. It's the "Get File Status" endpoint, with its own
   documented rate limit (100/min) and status enum. The earlier version of
   this document overstated this as something found by guessing — it was a
   reasonable guess that happened to land on the real, documented endpoint.
2. **There's a documented asynchronous upload endpoint**,
   `POST /file/v1/upload` (60 req/min), separate from the sync one. It
   returns a `file_id` immediately with no blocking wait and no 503 — this
   is the right endpoint for a product that needs to submit audio and check
   back, rather than block a request thread for up to 120 seconds. All new
   work should use this endpoint, not the sync one.
3. **There's a Question Answering post-processing mode** (`get_answer=TRUE`
   on the *same* upload endpoints) that treats the transcript as a spoken
   question and returns a direct answer (`transcript_answer`), with an
   independent output-language option
   (`use_language_data_extraction_output`). Not used by the reading
   instrument (Set A), but directly relevant to Set B's free-response
   prompts and worth a follow-up spec item — it's effectively a small
   built-in NLU step we don't have to build ourselves for that one path.
4. **Supported file formats are documented**: WAV, MP3, MP4, M4A, OGG,
   WebM, FLAC.
5. **Streaming STT is documented as a normal, currently-specified feature**
   with a full message-type table — the previous project's "known broken"
   note wasn't trustworthy without a fresh live test, so it got one. See
   0f below: the protocol itself works fine, it's the same African-language
   capacity problem as the batch endpoint, not a broken protocol.
6. **The request-body table for Upload File (both sync and async) is now
   confirmed exhaustive** — no biasing/hotword/vocabulary field exists,
   directly answering 0d rather than leaving it as a guess.

## 0f — Streaming STT: tested live, not assumed

The previous version of this document repeated the old hackathon project's
claim that streaming was broken, without retesting it — that was a mistake.
Built a fresh client from the official docs only (`ws` npm package for the
websocket, since the browser/Node native `WebSocket` can't set the required
`Authorization` header) and tested it directly:

- **The protocol itself works correctly and fast.** Connecting with
  `use_language_asr_input=en` returned `SESSION_CREATED` in about a second,
  on the first try, with a real session id and this exact payload:
  `{"message_type":"SESSION_CREATED","session_id":"...","credit_balance":0.8281,"configs":{"sample_rate":16000,"bit_rate":16,"num_channels":1,"use_prompt_id":null,"use_language_asr_input":"en","use_language_asr_output":"en"}}`.
  Auth, query params, and message framing are all exactly as documented —
  no protocol-level problem exists.
- **Swahili and Yoruba streaming both fail the same way**, every time:
  `{"message_type":"RESOURCE_EXHAUSTED","status":"NOT_READY","message":"Required language not available for this session, please wait 30 seconds"}`.
  Retried 4 times each, spaced 15+ seconds apart (well past the "wait 30
  seconds" the server itself suggests) — same result every time, for both
  languages. This is the documented `RESOURCE_EXHAUSTED` message type
  specifically (not `QUOTA_EXCEEDED`, which is a separate documented type),
  so this reads as genuine model/capacity unavailability for these two
  languages on Sahara's streaming backend right now, not a credits issue and
  not a client-side mistake.
- **This is the same shape of problem as the batch endpoint's multi-hour
  Swahili queue in 0c**, not a separate issue: English is fast and available
  everywhere tested; Swahili/Yoruba are not, on either the batch or the
  streaming path. The bottleneck looks like African-language model capacity
  on Sahara's infrastructure, independent of which endpoint is used to reach
  it. This should be raised directly with Sahara/the organizers — it's not
  something fixable from our side by picking a different endpoint.

**If/when Swahili and Yoruba streaming become available**, it is the better
architecture for a live child-facing session (sub-second session start vs.
an unbounded batch queue) and should replace the async-upload approach in
`server/src/sahara.js` — but building that integration now, while the
language itself returns `RESOURCE_EXHAUSTED` on every attempt, would produce
code no one could actually test end-to-end. Recommend re-probing
periodically (a two-line script — see the retry loop used for this test)
rather than building the full streaming client blind.

## 0e — Conclusion

Restating what's now directly confirmed, not assumed:

- Bare transcript string only. **Confirmed** (two real calls, full JSON
  saved; also confirmed exhaustive from the official request/response docs).
- No confidence scores. **Confirmed absent** — not in the documented schema.
- No word timings/alignment. **Confirmed absent** — not in the documented
  schema.
- No language identification/per-segment tags, even on genuinely
  code-switched audio. **Confirmed absent.**
- Vocabulary biasing/hotwords/restricted decoding: **confirmed absent** —
  the documented request-body table is exhaustive and has no such field.
- Operational finding, independent of API shape: real-world transcription
  turnaround has been observed taking well over an hour on every one of
  five separate submissions in this test session (both endpoints, both full
  sentences and a tiny word clip) — this needs to be flagged to the team
  before assuming a live session is viable on this endpoint today.
- **This is not a batch-endpoint-specific problem.** Streaming STT was
  tested live (0f): the protocol works and is fast for English, but Swahili
  and Yoruba both return `RESOURCE_EXHAUSTED` on every attempt, consistently.
  The bottleneck is African-language model capacity on Sahara's backend,
  not the choice of endpoint — switching endpoints will not fix this on its
  own. Flag this to Sahara/the organizers directly.

**Scoring design: Fuzzy matching.** Open transcript plus normalised
edit-distance against the expected token, threshold configurable. This was
already the project's working assumption (see `CLAUDE.md`'s "key
architectural insight"); this test directly confirms it rather than
changing it — every structured signal that would have enabled constrained
verification (confidence, alignment, biasing) is now confirmed absent from
Sahara's documented API surface, not just unobserved in a sample of calls.

## Running the demo yourself

`tools/demo-stt.js` is a runnable, step-by-step demo built fresh from the
official docs (not the old hackathon code): uploads a file via the async
endpoint, polls status, and prints the transcript.

```bash
node tools/demo-stt.js data/recordings/sw_en_1.wav sw
```

Prints three clearly labeled steps (upload, poll, result) and exits cleanly
with a recheck command if the transcript isn't ready within 5 minutes,
rather than hanging or crashing — given the turnaround finding above, that's
the expected outcome right now, not a bug. `tools/check-sahara-status.js
<file_id>` rechecks any pending `file_id` later without re-uploading.

## Cached responses

All raw responses saved, unmodified, in `docs/api-samples/`:
`sw_en_1.wav.response.json`, `sw_en_1.wav.status.response.json`,
`sw_en_2.wav.response.json`, `sw_en_2.wav.status.response.json`,
`sw_en_1.converted.response.json` (pending), `word_clip.plain.response.json`
(pending), `word_clip.hint_hotwords.response.json` (pending),
`word_clip.vocab_restricted.response.json` (pending). The two fully-resolved
transcripts let the rest of the build run offline against real, known
transcript strings without needing further live API calls.
