import { useEffect, useRef, useState } from 'react'
import { DuckMark } from './DuckMark'

const STATUS_LINES = [
  'Waking up',
  'Recalling memories',
  'Indexing decisions',
  'Ready',
]

const TOTAL_MS = 2000
const STEP_MS = TOTAL_MS / STATUS_LINES.length

interface SplashProps {
  onDone: () => void
}

/**
 * Full screen boot splash. The duck mark draws in, then the wordmark and
 * tagline. A thin progress shimmer runs while the status text cycles. It
 * auto dismisses after about two seconds, and clicking or pressing any key
 * skips it immediately.
 */
export function Splash({ onDone }: SplashProps) {
  const [statusIndex, setStatusIndex] = useState(0)
  const [leaving, setLeaving] = useState(false)
  const doneRef = useRef(false)

  function finish() {
    if (doneRef.current) return
    doneRef.current = true
    setLeaving(true)
    // Allow the fade out to play before unmounting.
    window.setTimeout(onDone, 320)
  }

  useEffect(() => {
    const ticker = window.setInterval(() => {
      setStatusIndex((i) => Math.min(i + 1, STATUS_LINES.length - 1))
    }, STEP_MS)

    const autoDismiss = window.setTimeout(finish, TOTAL_MS)

    function onKey(e: KeyboardEvent) {
      e.preventDefault()
      finish()
    }
    window.addEventListener('keydown', onKey)

    return () => {
      window.clearInterval(ticker)
      window.clearTimeout(autoDismiss)
      window.removeEventListener('keydown', onKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Quack is starting"
      onClick={finish}
      className={`fixed inset-0 z-50 flex cursor-pointer flex-col items-center justify-center bg-base transition-opacity duration-300 ${
        leaving ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="quack-pop flex flex-col items-center">
        <div className="quack-amber-glow rounded-2xl">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-high">
            <DuckMark size={36} />
          </div>
        </div>

        <h1
          className="quack-rise mt-6 text-3xl font-semibold tracking-tight text-ink"
          style={{ animationDelay: '0.25s' }}
        >
          Quack
        </h1>
        <p
          className="quack-rise mt-1 text-sm text-ink-soft"
          style={{ animationDelay: '0.4s' }}
        >
          Your codebase remembers.
        </p>
      </div>

      {/* Progress shimmer */}
      <div
        className="quack-fade mt-9 h-px w-56 overflow-hidden rounded-full bg-white/10"
        style={{ animationDelay: '0.5s' }}
      >
        <div className="quack-shimmer h-full w-1/3 rounded-full bg-gradient-to-r from-transparent via-amber to-transparent" />
      </div>

      {/* Cycling status line */}
      <p
        className="quack-fade mt-4 font-mono text-xs text-ink-muted"
        style={{ animationDelay: '0.55s' }}
      >
        {STATUS_LINES[statusIndex]}
      </p>

      <p className="absolute bottom-6 text-[11px] text-ink-muted/70">
        Click anywhere to skip
      </p>
    </div>
  )
}
