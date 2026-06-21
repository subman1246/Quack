import { Brain, Search, type LucideIcon } from 'lucide-react'
import { PenLine } from 'lucide-react'

export type TabId = 'recall' | 'remember' | 'memory'

interface TabDef {
  id: TabId
  label: string
  icon: LucideIcon
}

const TABS: TabDef[] = [
  { id: 'recall', label: 'Recall', icon: Search },
  { id: 'remember', label: 'Remember', icon: PenLine },
  { id: 'memory', label: 'Memory', icon: Brain },
]

interface TabsProps {
  active: TabId
  onChange: (id: TabId) => void
}

/** Accessible tab navigation. Arrow keys move between tabs. */
export function Tabs({ active, onChange }: TabsProps) {
  function onKeyDown(e: React.KeyboardEvent) {
    const idx = TABS.findIndex((t) => t.id === active)
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      onChange(TABS[(idx + 1) % TABS.length].id)
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      onChange(TABS[(idx - 1 + TABS.length) % TABS.length].id)
    }
  }

  return (
    <div
      role="tablist"
      aria-label="Quack sections"
      onKeyDown={onKeyDown}
      className="inline-flex items-center gap-1 rounded-xl border border-hairline bg-surface p-1"
    >
      {TABS.map((tab) => {
        const Icon = tab.icon
        const selected = tab.id === active
        return (
          <button
            key={tab.id}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={selected}
            aria-controls={`panel-${tab.id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={`quack-press quack-focusable flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium ${
              selected
                ? 'bg-surface-high text-ink shadow-sm'
                : 'text-ink-muted hover:text-ink-soft'
            }`}
          >
            <Icon
              size={15}
              className={selected ? 'text-amber' : ''}
              aria-hidden="true"
            />
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
