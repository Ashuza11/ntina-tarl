import { useRef, useState } from "react"

// Records mic audio via MediaRecorder and hands the caller a Blob when
// stopped. Sahara's documented supported formats include WebM (see
// docs/API-FINDINGS.md), which is what MediaRecorder produces by default in
// every major browser -- no client-side transcoding needed.
function RecordButton({ onRecordingComplete, disabled }) {
  const [isRecording, setIsRecording] = useState(false)
  const [error, setError] = useState(null)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])

  async function startRecording() {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" })
        stream.getTracks().forEach((track) => track.stop())
        onRecordingComplete(blob)
      }

      recorder.start()
      mediaRecorderRef.current = recorder
      setIsRecording(true)
    } catch (err) {
      setError("Couldn't access the microphone. Check browser permissions and try again.")
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop()
    setIsRecording(false)
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative flex items-center justify-center">
        {isRecording && (
          <span className="pulse-ring absolute h-20 w-20 rounded-full bg-gold" aria-hidden="true" />
        )}
        <button
          type="button"
          onClick={isRecording ? stopRecording : startRecording}
          disabled={disabled}
          className={`relative z-10 flex h-20 w-20 items-center justify-center rounded-full text-white text-lg font-semibold shadow-lg transition-colors disabled:opacity-40 ${
            isRecording ? "bg-terracotta recording-btn-pulse" : "bg-forest hover:bg-forest-light"
          }`}
        >
          {isRecording ? "Stop" : "Speak"}
        </button>
      </div>

      {isRecording && (
        <div className="flex items-end gap-1 h-8" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className={`w-1.5 bg-terracotta ${i % 2 === 0 ? "waveform-bar-tall" : "waveform-bar"}`}
              style={{ animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </div>
      )}

      {error && <p className="text-terracotta-dark text-sm">{error}</p>}
    </div>
  )
}

export default RecordButton
