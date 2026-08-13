# Config

One file per language pair. This is what makes "language is a config value,
not a code branch" real — `engine/`, `server/`, and `web/` all take a loaded
config as a parameter and never branch on which pair is active.

`languages/template.yaml` shows the shape. Copy it to `<pair>.yaml` to add a
pair — see `docs/API-FINDINGS.md` before filling in `stt.language_code` or
`tts.voice_accent` for a new pair: Sahara's Swahili support is confirmed
(`sw`), but Yoruba's Sahara language code is **unconfirmed** — do not guess
it, check Sahara's own Supported Languages docs first.
