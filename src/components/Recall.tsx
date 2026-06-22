import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Keyboard, Search, X } from 'lucide-react'
import { recall, type Episode, type RecallResult } from '../lib/quack'
import { gradeOf, RecallResultView } from './RecallShared'
import { FileHistoryPanel } from './FileHistoryPanel'
import { EpisodeDetailModal } from './Memory'

/* ---------------------------------------------------------------------------
   Recall tab. Ask Quack a question, watch the confidence gauge fill, and copy
   the cited episode ids. Recent queries persist per project in localStorage.
   File-type citation chips open the File History slide-over instead of
   copying, so every file reference is one click away from its full history.
--------------------------------------------------------------------------- */

const SUGGESTIONS = [
  'Why did we choose single-flight?',
  'Have we seen a cache hang before?',
  'What broke when we upgraded p-memoize?',
  'Any past issues touching src/cache.ts?',
]

const isMac =
  typeof navigator !== 'undefined' &&
  /mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent)

const MOD_LABEL = isMac ? 'Cmd' : 'Ctrl'

/* ------------------------------- Toasts -------------------------------- */

type ToastKind = 'success' | 'error'
interface Toast {
  id: number
  kind: ToastKind
  message: string
}

function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const idRef = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  const push = useCallback(
    (kind: ToastKind, message: string) => {
      const id = ++idRef.current
      setToasts((list) => [...list, { id, kind, message }])
      window.setTimeout(() => dismiss(id), 2400)
    },
    [dismiss],
  )

  return { toasts, push, dismiss }
}

function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: Toast[]
  onDismiss: (id: number) => void
}) {
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-5 z-50 flex flex-col items-center gap-2 px-4"
    >
      {toasts.map((t) => {
        const ok = t.kind === 'success'
        return (
          <div
            key={t.id}
            role="status"
            onClick={() => onDismiss(t.id)}
            className="quack-rise pointer-events-auto flex max-w-sm cursor-default items-center gap-2.5 rounded-xl border border-hairline bg-surface-high px-3.5 py-2.5 text-sm text-ink shadow-lg backdrop-blur"
          >
            <span
              className="flex h-5 w-5 flex-none items-center justify-center rounded-full"
              style={{
                backgroundColor: ok
                  ? 'rgba(70, 201, 139, 0.16)'
                  : 'rgba(242, 97, 91, 0.16)',
                color: ok ? '#46c98b' : 'var(--color-bug)',
              }}
            >
              {ok ? <Check size={13} /> : <X size={13} />}
            </span>
            {t.message}
          </div>
        )
      })}
    </div>
  )
}

/* --------------------------- Shortcuts overlay ------------------------- */

function ShortcutsOverlay({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const rows: { keys: string[]; label: string }[] = [
    { keys: [MOD_LABEL, 'K'], label: 'Focus the recall input' },
    { keys: [MOD_LABEL, 'Enter'], label: 'Run recall' },
    { keys: ['?'], label: 'Toggle this help' },
    { keys: ['Esc'], label: 'Close this help' },
  ]

  return (
    <div
      className="quack-fade fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      onClick={onClose}
    >
      <div
        className="quack-card quack-rise w-full max-w-sm rounded-2xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-ink">
            <Keyboard size={16} className="text-amber" aria-hidden="true" />
            <span className="text-sm font-semibold">Keyboard shortcuts</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close shortcuts help"
            className="quack-press quack-focusable rounded-lg p-1 text-ink-muted hover:text-ink"
          >
            <X size={16} />
          </button>
        </div>
        <ul className="mt-4 flex flex-col gap-2.5">
          {rows.map((r) => (
            <li
              key={r.label}
              className="flex items-center justify-between gap-4 text-sm text-ink-soft"
            >
              <span>{r.label}</span>
              <span className="flex items-center gap-1">
                {r.keys.map((k) => (
                  <kbd
                    key={k}
                    className="rounded-md border border-hairline bg-surface px-1.5 py-0.5 font-mono text-[11px] text-ink"
                  >
                    {k}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/* ------------------------------- Recent -------------------------------- */

interface RecentEntry {
  query: string
  confidence: number
  at: number
}

const RECENT_LIMIT = 6

function recentKey(project: string) {
  return `quack:recent:${project || 'default'}`
}

function loadRecent(project: string): RecentEntry[] {
  try {
    const raw = localStorage.getItem(recentKey(project))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (e) => e && typeof e.query === 'string' && typeof e.confidence === 'number',
    )
  } catch {
    return []
  }
}

function saveRecent(project: string, entries: RecentEntry[]) {
  try {
    localStorage.setItem(recentKey(project), JSON.stringify(entries))
  } catch {
    // Storage unavailable. Recent history is best effort only.
  }
}

/* ----------------------------- Recall panel ---------------------------- */

export function RecallPanel({ project }: { project: string }) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<RecallResult | null>(null)
  const [recent, setRecent] = useState<RecentEntry[]>(() => loadRecent(project))
  const [recentOpen, setRecentOpen] = useState(true)
  const [showHelp, setShowHelp] = useState(false)

  // File History panel state -- null means closed.
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  // Episode detail state for episodes opened from the file history panel.
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null)

  const inputRef = useRef<HTMLTextAreaElement>(null)
  const { toasts, push, dismiss } = useToasts()

  // Reload persisted history when the project changes, adjusting state during
  // render (React's endorsed pattern) instead of in an effect.
  const [prevProject, setPrevProject] = useState(project)
  if (prevProject !== project) {
    setPrevProject(project)
    setRecent(loadRecent(project))
  }

  const copyText = useCallback(
    async (text: string, message: string) => {
      try {
        await navigator.clipboard.writeText(text)
        push('success', message)
        return true
      } catch {
        push('error', 'Could not copy to clipboard')
        return false
      }
    },
    [push],
  )

  const runRecall = useCallback(
    async (raw: string) => {
      const q = raw.trim()
      if (!q || loading) return
      setLoading(true)
      setResult(null)
      try {
        const res = await recall(project, q)
        setResult(res)
        setRecent((prev) => {
          const next: RecentEntry[] = [
            { query: q, confidence: res.confidence, at: Date.now() },
            ...prev.filter((e) => e.query !== q),
          ].slice(0, RECENT_LIMIT)
          saveRecent(project, next)
          return next
        })
      } catch {
        push('error', 'Recall failed. Please try again.')
      } finally {
        setLoading(false)
      }
    },
    [project, loading, push],
  )

  const onChip = useCallback(
    (text: string) => {
      setQuery(text)
      runRecall(text)
    },
    [runRecall],
  )

  // Global shortcuts: mod+K focuses the input, "?" toggles help.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = isMac ? e.metaKey : e.ctrlKey
      if (mod && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault()
        inputRef.current?.focus()
        return
      }
      const target = e.target as HTMLElement | null
      const typing =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      if (e.key === '?' && !typing) {
        e.preventDefault()
        setShowHelp((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function onInputKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const mod = isMac ? e.metaKey : e.ctrlKey
    if (mod && e.key === 'Enter') {
      e.preventDefault()
      runRecall(query)
    }
  }

  const showEmpty = !loading && !result

  return (
    <div className="p-5 sm:p-6">
      {/* Input */}
      <div className="quack-rise">
        <div className="mb-1.5 flex items-center justify-between">
          <label
            htmlFor="recall-input"
            className="font-mono text-[11px] uppercase tracking-wider text-ink-muted"
          >
            Ask Quack
          </label>
          <span className="hidden items-center gap-1 text-ink-muted sm:flex">
            <kbd className="rounded border border-hairline bg-surface px-1.5 py-0.5 font-mono text-[10px]">
              {MOD_LABEL} K
            </kbd>
          </span>
        </div>
        <textarea
          id="recall-input"
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onInputKeyDown}
          rows={4}
          spellCheck={false}
          placeholder="Paste an error, a snippet, or describe what you're seeing..."
          className="quack-focusable w-full resize-y rounded-xl border border-hairline bg-surface px-3.5 py-3 text-sm leading-relaxed text-ink placeholder:text-ink-muted focus:border-amber/50"
        />
        <div className="mt-2.5 flex items-center justify-between gap-3">
          <span className="font-mono text-[11px] text-ink-muted">
            {MOD_LABEL} + Enter to recall
          </span>
          <button
            type="button"
            onClick={() => runRecall(query)}
            disabled={!query.trim() || loading}
            className={`quack-press quack-focusable inline-flex items-center gap-2 rounded-lg bg-amber px-4 py-2 text-sm font-semibold text-base disabled:cursor-not-allowed disabled:opacity-40 ${
              query.trim() && !loading ? 'quack-amber-glow' : ''
            }`}
          >
            <Search size={15} aria-hidden="true" />
            Recall
          </button>
        </div>
      </div>

      {/* Empty state suggestions */}
      {showEmpty && (
        <div className="quack-fade mt-6">
          <p className="text-xs text-ink-muted">Try one of these</p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onChip(s)}
                className="quack-press quack-focusable rounded-full border border-hairline bg-surface px-3 py-1.5 text-xs text-ink-soft hover:border-amber/40 hover:text-ink"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div
          className="quack-fade mt-8 flex flex-col items-center justify-center py-10"
          aria-live="polite"
        >
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="quack-dot h-2.5 w-2.5 rounded-full bg-amber"
                style={{ animationDelay: `${i * 0.16}s` }}
              />
            ))}
          </div>
          <span className="mt-3 font-mono text-[11px] text-ink-muted">
            Quack is remembering...
          </span>
        </div>
      )}

      {/* Result -- file-type citation chips open File History instead of copying */}
      {!loading && result && (
        <div className="mt-7">
          <RecallResultView
            result={result}
            layout="split"
            onCopyAnswer={(text) => copyText(text, 'Answer copied')}
            onCopyCitation={(id) => copyText(id, `Copied ${id}`)}
            onOpenFile={(path) => setSelectedFile(path)}
          />
        </div>
      )}

      {/* Recent */}
      {recent.length > 0 && (
        <div className="mt-8 border-t border-hairline pt-5">
          <button
            type="button"
            onClick={() => setRecentOpen((v) => !v)}
            aria-expanded={recentOpen}
            className="quack-focusable flex items-center gap-1.5 rounded-md font-mono text-[11px] uppercase tracking-wider text-ink-muted hover:text-ink-soft"
          >
            <ChevronDown
              size={13}
              aria-hidden="true"
              className="transition-transform"
              style={{
                transform: recentOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
              }}
            />
            Recent ({recent.length})
          </button>
          {recentOpen && (
            <ul className="quack-fade mt-3 flex flex-col gap-1.5">
              {recent.map((entry) => {
                const pct = Math.round(entry.confidence * 100)
                const { color } = gradeOf(pct)
                return (
                  <li key={`${entry.query}-${entry.at}`}>
                    <button
                      type="button"
                      onClick={() => onChip(entry.query)}
                      className="quack-press quack-focusable flex w-full items-center gap-3 rounded-lg border border-hairline bg-surface px-3 py-2 text-left hover:border-amber/30"
                    >
                      <span className="min-w-0 flex-1 truncate text-sm text-ink-soft">
                        {entry.query}
                      </span>
                      <span
                        className="flex-none font-mono text-[11px] tabular-nums"
                        style={{ color }}
                      >
                        {pct}%
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}

      {showHelp && <ShortcutsOverlay onClose={() => setShowHelp(false)} />}
      <ToastStack toasts={toasts} onDismiss={dismiss} />

      {/* File History slide-over */}
      {selectedFile !== null && (
        <FileHistoryPanel
          path={selectedFile}
          project={project}
          onClose={() => setSelectedFile(null)}
          onEpisodeClick={(ep) => {
            setSelectedFile(null)
            setSelectedEpisode(ep)
          }}
        />
      )}

      {/* Episode detail opened from File History */}
      {selectedEpisode !== null && (
        <EpisodeDetailModal
          episode={selectedEpisode}
          project={project}
          onClose={() => setSelectedEpisode(null)}
          onFileClick={(path) => {
            setSelectedEpisode(null)
            setSelectedFile(path)
          }}
        />
      )}
    </div>
  )
}
