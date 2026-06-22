import { useCallback, useEffect, useState } from 'react'
import { Header } from './components/Header'
import type { ConnectionState } from './components/Header'
import { Splash } from './components/Splash'
import { Tabs } from './components/Tabs'
import type { TabId } from './components/Tabs'
import { RecallPanel } from './components/Recall'
import { RememberPanel } from './components/Remember'
import { MemoryPanel } from './components/Memory'
import { SettingsPanel } from './components/Settings'
import { health } from './lib/quack'
import {
  type QuackSettings,
  applyAccentColor,
  loadSettings,
  pushRecentProject,
  saveSettings,
} from './lib/settings-store'

/* ---------------------------------------------------------------------------
   Apply the stored accent color before the first React paint so there is no
   flash of the default amber when a custom color has been saved.
--------------------------------------------------------------------------- */
const _initialSettings = loadSettings()
applyAccentColor(_initialSettings.accentColor)

export default function App() {
  const [settings, setSettings] = useState<QuackSettings>(_initialSettings)
  const [settingsOpen, setSettingsOpen] = useState(false)
  // Skip splash if the user has turned it off in settings.
  const [booted, setBooted] = useState(!_initialSettings.splashOnLaunch)
  const [project, setProject] = useState('quack-demo')
  const [tab, setTab] = useState<TabId>('recall')
  const [connection, setConnection] = useState<ConnectionState>('neutral')

  // Seed the initial project into recent history once.
  useEffect(() => {
    pushRecentProject(project)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Reset connection state when project changes (state-during-render pattern).
  const [prevProject, setPrevProject] = useState(project)
  if (prevProject !== project) {
    setPrevProject(project)
    setConnection('neutral')
  }

  // Check the Quack bridge on load and whenever the project changes.
  useEffect(() => {
    let active = true
    health(project)
      .then((ok) => {
        if (active) setConnection(ok ? 'ok' : 'error')
      })
      .catch(() => {
        if (active) setConnection('error')
      })
    return () => {
      active = false
    }
  }, [project])

  // Lock scroll while the splash is up.
  useEffect(() => {
    document.body.style.overflow = booted ? '' : 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [booted])

  /** Apply a settings patch, persist, and update accent color if needed. */
  const updateSettings = useCallback((patch: Partial<QuackSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch }
      saveSettings(next)
      if (patch.accentColor) applyAccentColor(patch.accentColor)
      return next
    })
  }, [])

  /** Change the active project from the settings panel or the main input. */
  function changeProject(name: string) {
    setProject(name)
    if (name.trim()) pushRecentProject(name.trim())
  }

  const rootClass = [
    'quack-noise quack-glow relative min-h-full',
    settings.density === 'compact' ? 'quack-compact' : '',
    settings.reduceMotion ? 'quack-no-motion' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={rootClass}>
      {!booted && <Splash onDone={() => setBooted(true)} />}

      <div
        className={`relative z-10 mx-auto flex min-h-screen max-w-3xl flex-col px-5 py-6 transition-opacity duration-500 sm:px-6 sm:py-8 ${
          booted ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <Header
          connection={connection}
          onSettingsClick={() => setSettingsOpen(true)}
        />

        {/* Project selector */}
        <div className="quack-rise mt-7">
          <label
            htmlFor="project"
            className="mb-1.5 block font-mono text-[11px] uppercase tracking-wider text-ink-muted"
          >
            Project
          </label>
          <input
            id="project"
            type="text"
            value={project}
            onChange={(e) => setProject(e.target.value)}
            onBlur={(e) => {
              const name = e.target.value.trim()
              if (name) pushRecentProject(name)
            }}
            spellCheck={false}
            autoComplete="off"
            placeholder="quack-demo"
            className="quack-focusable w-full max-w-xs rounded-lg border border-hairline bg-surface px-3 py-2 font-mono text-sm text-ink placeholder:text-ink-muted focus:border-amber/50"
          />
        </div>

        {/* Tabs + command card */}
        <div className="quack-rise mt-7" style={{ animationDelay: '0.05s' }}>
          <Tabs active={tab} onChange={setTab} />
        </div>

        <main className="quack-card quack-fade mt-4 flex-1 rounded-2xl">
          <section
            role="tabpanel"
            id={`panel-${tab}`}
            aria-labelledby={`tab-${tab}`}
            tabIndex={0}
            className="quack-focusable rounded-2xl"
          >
            {tab === 'recall' && <RecallPanel project={project} />}
            {tab === 'remember' && <RememberPanel project={project} />}
            {tab === 'memory' && <MemoryPanel project={project} />}
          </section>
        </main>

        <footer className="mt-8 text-center font-mono text-[11px] text-ink-muted">
          Powered by Parcle
        </footer>
      </div>

      {settingsOpen && (
        <SettingsPanel
          settings={settings}
          onSettingsChange={updateSettings}
          project={project}
          onProjectChange={changeProject}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  )
}
