// Intron Sahara STT client. Built directly from the official docs
// (docs.voice.intron.io), not the older hackathon project's code -- see
// docs/API-FINDINGS.md for the full writeup and the correction made after
// reading the official docs.
//
// Uses the ASYNC upload endpoint (POST /file/v1/upload), not the sync one --
// it returns a file_id immediately with no blocking wait, which matters a
// lot here: real-world transcription turnaround has been observed taking
// well over an hour in testing, so nothing in this server should ever block
// a request waiting on Sahara directly.

const UPLOAD_URL = "https://infer.voice.intron.io/file/v1/upload"
const STATUS_URL = (fileId) => `https://infer.voice.intron.io/file/v1/status/${fileId}`

const TERMINAL_STATUSES = new Set(["FILE_TRANSCRIBED", "FILE_PROCESSING_FAILED"])

export async function uploadAudio(apiKey, audioBuffer, fileName, languageCode) {
  const form = new FormData()
  form.set("audio_file_name", fileName)
  form.set("audio_file_blob", new Blob([audioBuffer]), fileName)
  form.set("use_language_asr_input", languageCode)

  const res = await fetch(UPLOAD_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  })
  const body = await res.json()
  if (res.status !== 200 || !body?.data?.file_id) {
    throw new Error(`Sahara upload failed: HTTP ${res.status} ${JSON.stringify(body)}`)
  }
  return body.data.file_id
}

// A transient DNS/connect blip has been observed repeatedly against this
// API during testing, unrelated to request content -- retry a few times
// before surfacing an error to the caller.
export async function getStatus(apiKey, fileId, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(STATUS_URL(fileId), {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
      const body = await res.json()
      return { httpStatus: res.status, ...body }
    } catch (err) {
      if (attempt === retries) throw err
      await new Promise((resolve) => setTimeout(resolve, 1500 * attempt))
    }
  }
}

export function isTerminal(processingStatus) {
  return TERMINAL_STATUSES.has(processingStatus)
}
