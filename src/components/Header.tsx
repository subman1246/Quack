import { Settings } from 'lucide-react'
import { DuckMark } from './DuckMark'

export type ConnectionState = 'neutral' | 'ok' | 'error'

interface HeaderProps {
  connection: ConnectionState
  onSettingsClick: () => void
}

const DOT: Record<
  ConnectionState,
  { color: string; label: string; title: string }
> = {
  neutral: {
    color: 'rgba(255,255,255,0.25)',
    label: 'Checking memory',
    title: 'Checking the Quack connection',
  },
  ok: {
    color: '#46c98b',
    label: 'Memory online',
    title: 'Quack is connected and remembering',
  },
  error: {
    color: 'var(--color-amber)',
    label: 'Memory offline',
    title: 'Quack cannot reach memory right now',
  },
}

/** Top header: duck mark, wordmark, tagline, connection indicator, and settings. */
export function Header({ connection, onSettingsClick }: HeaderProps) {
  const dot = DOT[connection]
  return (
    <header className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-hairline bg-surface-high">
          <DuckMark size={24} />
        </div>
        <div className="leading-tight">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-semibold tracking-tight text-ink">
              Quack
            </span>
            <span className="hidden text-xs text-ink-muted sm:inline">
              Your codebase remembers.
            </span>
          </div>
          <span className="text-xs text-ink-muted sm:hidden">
            Your codebase remembers.
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onSettingsClick}
          aria-label="Open settings"
          className="quack-press quack-focusable flex h-8 w-8 items-center justify-center rounded-lg border border-hairline bg-surface text-ink-muted hover:text-ink"
        >
          <Settings size={15} aria-hidden="true" />
        </button>

        <div
          className="flex items-center gap-2 rounded-full border border-hairline bg-surface px-3 py-1.5"
          title={dot.title}
        >
          <span
            aria-hidden="true"
            className={`h-2 w-2 rounded-full ${
              connection === 'neutral' ? 'quack-dot' : ''
            }`}
            style={{
              backgroundColor: dot.color,
              boxShadow:
                connection === 'neutral' ? 'none' : `0 0 8px ${dot.color}`,
            }}
          />
          <span className="font-mono text-[11px] text-ink-muted">
            {dot.label}
          </span>
        </div>
      </div>
    </header>
  )
}
