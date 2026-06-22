import { useCallback, useEffect, useState } from 'react'
import {
  Check,
  ChevronRight,
  Loader2,
  Plus,
  Server,
  Trash2,
  X,
} from 'lucide-react'
import {
  ACCENT_PRESETS,
  BRIDGE_FALLBACK_URL,
  type QuackSettings,
  loadRecentProjects,
  pushRecentProject,
} from '../lib/settings-store'
import { clearEpisodes } from '../lib/episode-store'

/* ---------------------------------------------------------------------------
   Settings slide-over. Opens from the right side. All preference changes are
   applied live and persisted immediately. Bridge URL requires an explicit Save.
--------------------------------------------------------------------------- */

/* ----------------------------- Toggle switch ----------------------------- */

function Toggle({
  id,
  checked,
  onChange,
}: {
  id: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      role="switch"
      id={id}
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="quack-press quack-focusable relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full transition-colors"
      style={{
        backgroundColor: checked
          ? 'var(--color-amber)'
          : 'rgba(255,255,255,0.12)',
      }}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none mt-0.5 ml-0.5 inline-block h-4 w-4 rounded-full shadow transition-transform"
        style={{
          backgroundColor: checked ? 'var(--color-base)' : 'rgba(255,255,255,0.6)',
          transform: checked ? 'translateX(1rem)' : 'translateX(0)',
        }}
      />
    </button>
  )
}

/* ----------------------------- Section shell ----------------------------- */

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="border-t border-hairline pt-5">
      <p className="mb-4 font-mono text-[11px] uppercase tracking-widest text-ink-muted">
        {title}
      </p>
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  )
}

/* ----------------------------- Label + control row --------------------- */

function Row({
  label,
  id,
  children,
}: {
  label: string
  id?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <label htmlFor={id} className="flex-1 text-sm text-ink-soft">
        {label}
      </label>
      {children}
    </div>
  )
}

/* ----------------------------- Appearance section ----------------------- */

function AppearanceSection({
  settings,
  onUpdate,
}: {
  settings: QuackSettings
  onUpdate: (patch: Partial<QuackSettings>) => void
}) {
  return (
    <Section title="Appearance">
      {/* Accent color */}
      <div>
        <p className="mb-2 text-sm text-ink-soft">Accent color</p>
        <div className="flex flex-wrap items-center gap-2.5">
          {ACCENT_PRESETS.map((preset) => {
            const active = settings.accentColor === preset.hex
            return (
              <button
                key={preset.hex}
                type="button"
                title={preset.label}
                aria-label={`${preset.label} accent${active ? ' (active)' : ''}`}
                aria-pressed={active}
                onClick={() => onUpdate({ accentColor: preset.hex })}
                className="quack-press quack-focusable relative h-7 w-7 flex-none rounded-full"
                style={{ backgroundColor: preset.hex }}
              >
                {active && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <Check size={13} style={{ color: 'rgba(0,0,0,0.55)' }} />
                  </span>
                )}
                {active && (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 rounded-full"
                    style={{
                      boxShadow: `0 0 0 2px var(--color-base), 0 0 0 3.5px ${preset.hex}`,
                    }}
                  />
                )}
              </button>
            )
          })}
          {/* Custom color picker */}
          <label
            title="Custom color"
            className="quack-press quack-focusable relative flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-dashed border-hairline bg-surface hover:border-amber/50"
            aria-label="Custom accent color"
          >
            <input
              type="color"
              value={settings.accentColor}
              onChange={(e) => onUpdate({ accentColor: e.target.value })}
              className="absolute inset-0 h-full w-full cursor-pointer rounded-full opacity-0"
              aria-label="Custom accent color picker"
            />
            <span className="font-mono text-[10px] text-ink-muted">+</span>
          </label>
        </div>
      </div>

      {/* Density */}
      <div>
        <p className="mb-2 text-sm text-ink-soft">Density</p>
        <div className="inline-flex rounded-lg border border-hairline bg-surface p-0.5">
          {(['comfortable', 'compact'] as const).map((d) => {
            const active = settings.density === d
            return (
              <button
                key={d}
                type="button"
                aria-pressed={active}
                onClick={() => onUpdate({ density: d })}
                className={`quack-press quack-focusable rounded-md px-3 py-1.5 text-xs font-medium capitalize ${
                  active
                    ? 'bg-surface-high text-ink shadow-sm'
                    : 'text-ink-muted hover:text-ink-soft'
                }`}
              >
                {d}
              </button>
            )
          })}
        </div>
      </div>

      {/* Reduce motion */}
      <Row label="Reduce motion" id="s-motion">
        <Toggle
          id="s-motion"
          checked={settings.reduceMotion}
          onChange={(v) => onUpdate({ reduceMotion: v })}
        />
      </Row>

      {/* Splash on launch */}
      <Row label="Splash on launch" id="s-splash">
        <Toggle
          id="s-splash"
          checked={settings.splashOnLaunch}
          onChange={(v) => onUpdate({ splashOnLaunch: v })}
        />
      </Row>
    </Section>
  )
}

/* ----------------------------- Projects section ------------------------- */

function ProjectsSection({
  project,
  onProjectChange,
}: {
  project: string
  onProjectChange: (p: string) => void
}) {
  const [recent, setRecent] = useState(() => loadRecentProjects())
  const [newName, setNewName] = useState('')

  function switchTo(name: string) {
    onProjectChange(name)
    pushRecentProject(name)
    setRecent(loadRecentProjects())
  }

  function createNew() {
    const name = newName.trim()
    if (!name) return
    switchTo(name)
    setNewName('')
  }

  const others = recent.filter((p) => p !== project).slice(0, 5)

  return (
    <Section title="Projects">
      <div>
        <p className="mb-1 font-mono text-[11px] text-ink-muted">Active</p>
        <div className="rounded-lg border border-amber/30 bg-surface px-3 py-2 font-mono text-sm text-ink">
          {project}
        </div>
      </div>

      {others.length > 0 && (
        <div>
          <p className="mb-1 font-mono text-[11px] text-ink-muted">Recent</p>
          <ul className="flex flex-col gap-1">
            {others.map((p) => (
              <li key={p}>
                <button
                  type="button"
                  onClick={() => switchTo(p)}
                  className="quack-press quack-focusable flex w-full items-center justify-between rounded-lg border border-hairline bg-surface px-3 py-2 text-left font-mono text-xs text-ink-soft hover:border-amber/30 hover:text-ink"
                >
                  <span className="truncate">{p}</span>
                  <ChevronRight
                    size={13}
                    aria-hidden="true"
                    className="ml-2 flex-none text-ink-muted"
                  />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <p className="mb-1 font-mono text-[11px] text-ink-muted">New project</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createNew()}
            placeholder="project-name"
            spellCheck={false}
            autoComplete="off"
            className="quack-focusable min-w-0 flex-1 rounded-lg border border-hairline bg-surface px-3 py-2 font-mono text-xs text-ink placeholder:text-ink-muted focus:border-amber/50"
          />
          <button
            type="button"
            onClick={createNew}
            disabled={!newName.trim()}
            aria-label="Create project"
            className="quack-press quack-focusable flex-none rounded-lg border border-hairline bg-surface p-2 text-ink-muted hover:text-ink disabled:opacity-40"
          >
            <Plus size={15} aria-hidden="true" />
          </button>
        </div>
      </div>
    </Section>
  )
}

/* ----------------------------- Connection section ----------------------- */

type TestState = 'idle' | 'testing' | 'online' | 'offline'

function ConnectionSection({
  settings,
  onUpdate,
}: {
  settings: QuackSettings
  onUpdate: (patch: Partial<QuackSettings>) => void
}) {
  const effectiveUrl = settings.bridgeUrlOverride.trim() || BRIDGE_FALLBACK_URL
  const [urlDraft, setUrlDraft] = useState(effectiveUrl)
  const [testState, setTestState] = useState<TestState>('idle')
  const [latency, setLatency] = useState<number | null>(null)
  const [saved, setSaved] = useState(false)

  async function testConnection() {
    const url = urlDraft.trim().replace(/\/$/, '')
    if (!url) return
    setTestState('testing')
    setLatency(null)
    const t0 = Date.now()
    try {
      const res = await fetch(`${url}/health`)
      setLatency(Date.now() - t0)
      setTestState(res.ok ? 'online' : 'offline')
    } catch {
      setLatency(null)
      setTestState('offline')
    }
  }

  function save() {
    const trimmed = urlDraft.trim()
    onUpdate({
      bridgeUrlOverride: trimmed === BRIDGE_FALLBACK_URL ? '' : trimmed,
    })
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1500)
  }

  return (
    <Section title="Connection">
      <div>
        <label
          htmlFor="s-bridge-url"
          className="mb-1.5 block font-mono text-[11px] text-ink-muted"
        >
          Bridge URL
        </label>
        <input
          id="s-bridge-url"
          type="url"
          value={urlDraft}
          onChange={(e) => {
            setUrlDraft(e.target.value)
            setTestState('idle')
          }}
          spellCheck={false}
          className="quack-focusable w-full rounded-lg border border-hairline bg-surface px-3 py-2 font-mono text-xs text-ink focus:border-amber/50"
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={save}
            className="quack-press quack-focusable flex items-center gap-1.5 rounded-lg border border-hairline bg-surface px-3 py-1.5 text-xs text-ink-soft hover:text-ink"
          >
            {saved && <Check size={12} className="text-[#46c98b]" />}
            {saved ? 'Saved' : 'Save'}
          </button>
          <button
            type="button"
            onClick={testConnection}
            disabled={testState === 'testing'}
            className="quack-press quack-focusable flex items-center gap-1.5 rounded-lg border border-hairline bg-surface px-3 py-1.5 text-xs text-ink-soft hover:text-ink disabled:opacity-50"
          >
            {testState === 'testing' ? (
              <Loader2 size={12} className="animate-spin" aria-hidden="true" />
            ) : (
              <Server size={12} aria-hidden="true" />
            )}
            Test connection
          </button>
          {testState === 'online' && (
            <span
              role="status"
              className="font-mono text-[11px] text-[#46c98b]"
            >
              Online{latency !== null ? ` ${latency}ms` : ''}
            </span>
          )}
          {testState === 'offline' && (
            <span
              role="status"
              className="font-mono text-[11px]"
              style={{ color: 'var(--color-bug)' }}
            >
              Offline
            </span>
          )}
        </div>
      </div>
    </Section>
  )
}

/* -------------------------------- Data section -------------------------- */

function DataSection({ project }: { project: string }) {
  const [confirm, setConfirm] = useState(false)
  const [cleared, setCleared] = useState(false)

  function clearCache() {
    clearEpisodes(project)
    localStorage.removeItem(`quack:recent:${project || 'default'}`)
    setConfirm(false)
    setCleared(true)
    window.setTimeout(() => setCleared(false), 2400)
  }

  return (
    <Section title="Data">
      {!confirm ? (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setConfirm(true)}
            className="quack-press quack-focusable flex items-center gap-2 self-start rounded-lg border border-hairline bg-surface px-3 py-2 text-sm text-ink-soft hover:border-[rgba(242,97,91,0.3)] hover:text-[var(--color-bug)]"
          >
            <Trash2 size={14} aria-hidden="true" />
            Clear local memory cache
          </button>
          {cleared && (
            <span
              role="status"
              className="quack-fade flex items-center gap-1.5 text-xs text-[#46c98b]"
            >
              <Check size={12} aria-hidden="true" />
              Cache cleared for {project}
            </span>
          )}
          <p className="text-xs text-ink-muted">
            Only clears local browser data. Nothing stored in Parcle is
            affected.
          </p>
        </div>
      ) : (
        <div className="quack-fade rounded-xl border border-[rgba(242,97,91,0.25)] bg-surface p-4">
          <p className="text-sm text-ink">
            Clear all local episodes and recent recalls for{' '}
            <span className="font-mono">{project}</span>?
          </p>
          <p className="mt-0.5 text-xs text-ink-muted">
            Only clears local browser data. Parcle is not affected.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={clearCache}
              className="quack-press quack-focusable rounded-lg px-3 py-1.5 text-sm font-medium"
              style={{
                backgroundColor: 'rgba(242,97,91,0.15)',
                color: 'var(--color-bug)',
              }}
            >
              Clear cache
            </button>
            <button
              type="button"
              onClick={() => setConfirm(false)}
              className="quack-press quack-focusable rounded-lg border border-hairline px-3 py-1.5 text-sm text-ink-soft hover:text-ink"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </Section>
  )
}

/* ----------------------------- Settings panel --------------------------- */

interface SettingsProps {
  settings: QuackSettings
  onSettingsChange: (patch: Partial<QuackSettings>) => void
  project: string
  onProjectChange: (name: string) => void
  onClose: () => void
}

export function SettingsPanel({
  settings,
  onSettingsChange,
  project,
  onProjectChange,
  onClose,
}: SettingsProps) {
  const handleClose = useCallback(() => onClose(), [onClose])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleClose])

  return (
    <div
      className="quack-fade fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
      onClick={handleClose}
    >
      <div
        className="quack-slide-in-right quack-card flex h-full w-80 flex-col overflow-y-auto sm:w-96"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-none items-center justify-between border-b border-hairline px-5 py-4">
          <h2 className="text-sm font-semibold text-ink">Settings</h2>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close settings"
            className="quack-press quack-focusable rounded-lg p-1.5 text-ink-muted hover:text-ink"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-5 p-5">
          <AppearanceSection settings={settings} onUpdate={onSettingsChange} />
          <ProjectsSection project={project} onProjectChange={onProjectChange} />
          <ConnectionSection settings={settings} onUpdate={onSettingsChange} />
          <DataSection project={project} />
        </div>
      </div>
    </div>
  )
}
