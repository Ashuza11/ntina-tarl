# Config

One file per language pair. This is what makes "language is a config value,
not a code branch" real — `engine/`, `server/`, and `web/` all take a loaded
config as a parameter and never branch on which pair is active.

`languages/template.yaml` shows the shape. Copy it to `<pair>.yaml` to add a
pair — see `docs/API-FINDINGS.md` before filling in `stt.language_code` or
`tts.voice_accent` for a new pair. Confirmed against Sahara's own official
STT Supported Languages table (`docs.voice.intron.io`): `Swahili-English`
is code-switched, code `sw`; `Yoruba-English` is also code-switched, code
`yo`. Both rows are named with the `-English` suffix in Sahara's own STT
table — that's their model name for the code-switched pair, not a mistake
to "fix" to a bare `sw`/`yo`. TTS's separate Supported Languages And Accents
page names the same codes *without* the `-English` suffix (`Swahili`,
`Yoruba`) since TTS output isn't code-switched the same way — don't copy
the STT table's naming into a `tts.voice_accent` value or vice versa.
`voice_accent` itself is a third, different format again: the docs' own
`/tts/v1/generate` example uses the lowercase full word
(`"voice_accent":"swahili"`), not the 2-letter STT code (`sw`) and not a
capitalized name (`Swahili`) — copy the exact casing/format from a
documented example, don't infer it from a different endpoint's table.
