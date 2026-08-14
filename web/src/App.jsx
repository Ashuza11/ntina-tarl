import { useState } from "react"
import LandingPage from "./components/LandingPage"
import ReadingSession from "./components/ReadingSession"

function App() {
  const [view, setView] = useState("landing") // "landing" | "session"
  const [pair, setPair] = useState("sw-en") // "sw-en" | "yo-en"

  return (
    <div className="min-h-dvh bg-cream">
      {view === "landing" ? (
        <LandingPage pair={pair} onPairChange={setPair} onStart={() => setView("session")} />
      ) : (
        <div className="min-h-dvh flex items-center justify-center p-4">
          <ReadingSession pair={pair} onExit={() => setView("landing")} />
        </div>
      )}
    </div>
  )
}

export default App
