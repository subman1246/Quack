import { DuckMark } from './DuckMark'

export type ConnectionState = 'neutral' | 'ok' | 'error'

interface HeaderProps {
  connection: ConnectionState
}

const DOT: Record<ConnectionState, { color: string; label: string }> = {
  neutral: { color: 'rgba(255,255,255,0.25)', label: 'Connection idle' },
  ok: { color: 'var(--color-decision)', label: 'Connected' },
  error: { color: 'var(--color-bug)', label: 'Connection error' },
}

/** Top header: duck mark, wordmark, tagline, and connection indicator. */
export function Header({ connection }: HeaderProps) {
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

      <div
        className="flex items-center gap-2 rounded-full border border-hairline bg-surface px-3 py-1.5"
        title={dot.label}
      >
        <span
          aria-hidden="true"
          className="h-2 w-2 rounded-full"
          style={{
            backgroundColor: dot.color,
            boxShadow:
              connection === 'neutral'
                ? 'none'
                : `0 0 8px ${dot.color}`,
          }}
        />
        <span className="font-mono text-[11px] text-ink-muted">
          {dot.label}
        </span>
      </div>
    </header>
  )
}
