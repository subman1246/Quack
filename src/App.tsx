import { useEffect, useState } from 'react'
import { Header, type ConnectionState } from './components/Header'
import { Splash } from './components/Splash'
import { Tabs, type TabId } from './components/Tabs'
import { RecallPanel } from './components/Recall'
import { RememberPanel } from './components/Remember'
import { MemoryPanel } from './components/Memory'
import { health } from './lib/quack'

export default function App() {
  const [booted, setBooted] = useState(false)
  const [project, setProject] = useState('quack-demo')
  const [tab, setTab] = useState<TabId>('recall')
  const [connection, setConnection] = useState<ConnectionState>('neutral')

  // Reset to checking when the project changes, adjusting state during render
  // (React's endorsed pattern) rather than inside the effect.
  const [prevProject, setPrevProject] = useState(project)
  if (prevProject !== project) {
    setPrevProject(project)
    setConnection('neutral')
  }

  // Check the Quack connection on load and whenever the project changes.
  useEffect(() => {
    let active = true
    health(project)
      .then((res) => {
        if (active) setConnection(res.status === 'ok' ? 'ok' : 'error')
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

  return (
    <div className="quack-noise quack-glow relative min-h-full">
      {!booted && <Splash onDone={() => setBooted(true)} />}

      <div
        className={`relative z-10 mx-auto flex min-h-screen max-w-3xl flex-col px-5 py-6 transition-opacity duration-500 sm:px-6 sm:py-8 ${
          booted ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <Header connection={connection} />

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
    </div>
  )
}
