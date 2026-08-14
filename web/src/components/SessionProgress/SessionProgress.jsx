// Presentational only -- no state, no fetching. One dot per item in the
// session, colored by that item's own phase/confirmation, so a facilitator
// can see the whole session's status at a glance regardless of which item
// they're currently viewing (items keep processing in the background even
// when not current -- see ReadingSession's polling design).
function dotClasses(item) {
  if (item.phase === "error") return "bg-terracotta-dark"
  if (item.confirmation === "confirmed") return "bg-forest"
  if (item.confirmation === "overridden") return "bg-terracotta"
  if (item.phase === "result") return "bg-white border-2 border-terracotta"
  if (item.phase === "uploading" || item.phase === "processing") return "bg-gold recording-btn-pulse"
  return "bg-white border-2 border-gray-300"
}

function dotLabel(item, index) {
  const status =
    item.phase === "error"
      ? "error"
      : item.confirmation === "confirmed"
        ? "confirmed"
        : item.confirmation === "overridden"
          ? "overridden"
          : item.phase === "result"
            ? "needs facilitator review"
            : item.phase === "uploading" || item.phase === "processing"
              ? "Ntina is thinking"
              : "not started"
  return `Word ${index + 1}: ${item.text}, ${status}`
}

function SessionProgress({ items, currentIndex, onJump, onPrevious, onNext }) {
  return (
    <div className="flex flex-col items-center gap-2 w-full">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onPrevious}
          disabled={currentIndex === 0}
          className="text-forest text-sm font-semibold disabled:opacity-30"
        >
          ← Previous
        </button>

        <div className="flex gap-2" role="list" aria-label="Session progress">
          {items.map((item, i) => (
            <button
              key={item.item_id}
              type="button"
              onClick={() => onJump(i)}
              aria-label={dotLabel(item, i)}
              aria-current={i === currentIndex ? "step" : undefined}
              className={`h-3 w-3 rounded-full transition-transform ${dotClasses(item)} ${
                i === currentIndex ? "scale-150 ring-2 ring-offset-2 ring-forest" : ""
              }`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={onNext}
          disabled={currentIndex === items.length - 1}
          className="text-forest text-sm font-semibold disabled:opacity-30"
        >
          Next →
        </button>
      </div>

      <p className="text-gray-500 text-xs text-center">
        Words can take a while to finish. You can keep going with the next one while you wait.
      </p>
    </div>
  )
}

export default SessionProgress
