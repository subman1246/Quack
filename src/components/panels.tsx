import { Brain, PenLine, type LucideIcon } from 'lucide-react'

interface PlaceholderProps {
  icon: LucideIcon
  title: string
  body: string
}

function Placeholder({ icon: Icon, title, body }: PlaceholderProps) {
  return (
    <div className="quack-rise flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-hairline bg-surface-high text-amber">
        <Icon size={22} aria-hidden="true" />
      </div>
      <h2 className="mt-4 text-base font-semibold text-ink">{title}</h2>
      <p className="mt-1.5 max-w-sm text-sm text-ink-muted">{body}</p>
      <span className="mt-4 rounded-full border border-hairline bg-surface px-3 py-1 font-mono text-[11px] text-ink-muted">
        Coming in a later pass
      </span>
    </div>
  )
}

/* Placeholder panels. These get filled in with real interactions later. */

export function RememberPanel() {
  return (
    <Placeholder
      icon={PenLine}
      title="Remember"
      body="Capture a decision, bug, or dependency so the next person, or the next you, does not have to rediscover it."
    />
  )
}

export function MemoryPanel() {
  return (
    <Placeholder
      icon={Brain}
      title="Memory"
      body="Browse every episode the project has stored, newest first, grouped by type."
    />
  )
}
