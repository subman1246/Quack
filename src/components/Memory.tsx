import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, Pencil, Search, Trash2, X } from 'lucide-react'
import type { Episode, EpisodeType } from '../lib/quack'
import { EPISODE_META, EPISODE_TYPES } from '../lib/episode-meta'
import {
  useStoredEpisodes,
  seedIfEmpty,
  updateEpisode,
  deleteEpisode,
} from '../lib/episode-store'
import { FileHistoryPanel } from './FileHistoryPanel'

/* ---------------------------------------------------------------------------
   Memory tab. A searchable, filterable feed of episode cards. On first load
   the seed episodes are written to localStorage so edits and deletes persist
   across reloads. Clicking a card opens a detail view with an Edit mode.
   File chips are interactive: clicking one opens the File History slide-over.
--------------------------------------------------------------------------- */

function daysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

const SEED_EPISODES: Episode[] = [
  {
    type: 'bug',
    title: 'Cache stampede race condition',
    details:
      'Many concurrent misses hit the origin at once, hammering the database and spiking latency. The memoized loader was not coalescing in flight requests.',
    files: ['src/cache.ts'],
    packages: ['p-memoize'],
    createdAt: daysAgo(1),
  },
  {
    type: 'decision',
    title: 'Chose single-flight over a global mutex',
    details:
      'Single-flight collapses concurrent identical requests into one in flight promise. Simpler and faster than a global mutex that would serialise unrelated keys.',
    files: ['src/cache.ts'],
    packages: [],
    createdAt: daysAgo(2),
  },
  {
    type: 'dependency',
    title: 'p-memoize 4 to 7 broke caching',
    details:
      'The major bump changed the cache key behavior and default options, silently disabling memoization until the call sites were updated.',
    files: [],
    packages: ['p-memoize'],
    createdAt: daysAgo(3),
  },
  {
    type: 'bug',
    title: 'WebSocket reconnect storm',
    details:
      'After a brief network blip every client reconnected at the same instant, overwhelming the gateway. Needed jittered backoff to spread the load.',
    files: [],
    packages: [],
    createdAt: daysAgo(5),
  },
  {
    type: 'decision',
    title: 'Optimistic UI for the task board',
    details:
      'Apply task changes locally first and reconcile with the server response, rolling back on failure, so the board feels instant.',
    files: [],
    packages: [],
    createdAt: daysAgo(7),
  },
]

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const diff = Date.now() - then
  const sec = Math.round(diff / 1000)
  if (sec < 45) return 'just now'
  const min = Math.round(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.round(hr / 24)
  if (day < 30) return `${day}d ago`
  const mo = Math.round(day / 30)
  if (mo < 12) return `${mo}mo ago`
  return `${Math.round(mo / 12)}y ago`
}

/** Plain non-interactive chip, used for package names. */
function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md border border-hairline bg-surface px-1.5 py-0.5 font-mono text-[11px] text-ink-muted">
      {children}
    </span>
  )
}

/**
 * Interactive file chip. Clicking opens the File History slide-over.
 * stopPropagation prevents the parent card from receiving the click.
 */
function FileChip({
  path,
  onFileClick,
}: {
  path: string
  onFileClick: (path: string) => void
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onFileClick(path)
      }}
      aria-label={`View file history for ${path}`}
      className="quack-press quack-focusable rounded-md border border-hairline bg-surface px-1.5 py-0.5 font-mono text-[11px] text-ink-muted hover:border-amber/40 hover:text-ink-soft"
    >
      {path}
    </button>
  )
}

/* -------------------------- Episode detail modal ------------------------- */

export function EpisodeDetailModal({
  episode,
  project,
  onClose,
  onFileClick,
}: {
  episode: Episode
  project: string
  onClose: () => void
  onFileClick?: (path: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Episode>(episode)
  const [filesRaw, setFilesRaw] = useState(episode.files.join(', '))
  const [packagesRaw, setPackagesRaw] = useState(episode.packages.join(', '))

  const handleClose = useCallback(() => onClose(), [onClose])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleClose])

  const meta = EPISODE_META[draft.type] ?? EPISODE_META.bug
  const Icon = meta.icon

  function startEdit() {
    setDraft(episode)
    setFilesRaw(episode.files.join(', '))
    setPackagesRaw(episode.packages.join(', '))
    setEditing(true)
  }

  function save() {
    const updated: Episode = {
      ...draft,
      files: filesRaw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      packages: packagesRaw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    }
    updateEpisode(project, episode.createdAt, updated)
    onClose()
  }

  function handleDelete() {
    deleteEpisode(project, episode.createdAt)
    onClose()
  }

  return (
    <div
      className="quack-fade fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 px-4 py-12 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Episode detail"
      onClick={handleClose}
    >
      <div
        className="quack-card quack-rise w-full max-w-lg rounded-2xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span
              className="flex h-8 w-8 flex-none items-center justify-center rounded-lg"
              style={{ backgroundColor: meta.tintBg, color: meta.color }}
            >
              <Icon size={16} aria-hidden="true" />
            </span>
            <span
              className="text-[11px] font-medium uppercase tracking-wider"
              style={{ color: meta.color }}
            >
              {meta.label}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {!editing && (
              <button
                type="button"
                onClick={startEdit}
                aria-label="Edit episode"
                className="quack-press quack-focusable rounded-lg p-1.5 text-ink-muted hover:text-ink"
              >
                <Pencil size={15} />
              </button>
            )}
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close"
              className="quack-press quack-focusable rounded-lg p-1.5 text-ink-muted hover:text-ink"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* View mode */}
        {!editing && (
          <div className="mt-4">
            <h2 className="text-base font-semibold text-ink">{episode.title}</h2>
            {episode.details && (
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                {episode.details}
              </p>
            )}
            {(episode.files.length > 0 || episode.packages.length > 0) && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {episode.files.map((f) =>
                  onFileClick ? (
                    <FileChip key={`f-${f}`} path={f} onFileClick={onFileClick} />
                  ) : (
                    <Chip key={`f-${f}`}>{f}</Chip>
                  ),
                )}
                {episode.packages.map((p) => (
                  <Chip key={`p-${p}`}>{p}</Chip>
                ))}
              </div>
            )}
            <time
              className="mt-3 block font-mono text-[11px] text-ink-muted"
              dateTime={episode.createdAt}
            >
              {relativeTime(episode.createdAt)}
            </time>
          </div>
        )}

        {/* Edit mode */}
        {editing && (
          <div className="mt-4 flex flex-col gap-3">
            <div>
              <label className="mb-1 block font-mono text-[11px] uppercase tracking-wider text-ink-muted">
                Type
              </label>
              <select
                value={draft.type}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, type: e.target.value as EpisodeType }))
                }
                className="quack-focusable w-full rounded-lg border border-hairline bg-surface px-3 py-2 text-sm text-ink"
              >
                {EPISODE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {EPISODE_META[t].label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block font-mono text-[11px] uppercase tracking-wider text-ink-muted">
                Title
              </label>
              <input
                type="text"
                value={draft.title}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                className="quack-focusable w-full rounded-lg border border-hairline bg-surface px-3 py-2 text-sm text-ink"
              />
            </div>
            <div>
              <label className="mb-1 block font-mono text-[11px] uppercase tracking-wider text-ink-muted">
                Details
              </label>
              <textarea
                value={draft.details}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, details: e.target.value }))
                }
                rows={4}
                className="quack-focusable w-full resize-y rounded-lg border border-hairline bg-surface px-3 py-2 text-sm leading-relaxed text-ink"
              />
            </div>
            <div>
              <label className="mb-1 block font-mono text-[11px] uppercase tracking-wider text-ink-muted">
                Files
              </label>
              <input
                type="text"
                value={filesRaw}
                onChange={(e) => setFilesRaw(e.target.value)}
                placeholder="src/foo.ts, src/bar.ts"
                className="quack-focusable w-full rounded-lg border border-hairline bg-surface px-3 py-2 font-mono text-sm text-ink placeholder:text-ink-muted"
              />
            </div>
            <div>
              <label className="mb-1 block font-mono text-[11px] uppercase tracking-wider text-ink-muted">
                Packages
              </label>
              <input
                type="text"
                value={packagesRaw}
                onChange={(e) => setPackagesRaw(e.target.value)}
                placeholder="react, lodash"
                className="quack-focusable w-full rounded-lg border border-hairline bg-surface px-3 py-2 font-mono text-sm text-ink placeholder:text-ink-muted"
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-5 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleDelete}
            className="quack-press quack-focusable flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-[var(--color-bug)] hover:bg-[rgba(242,97,91,0.1)]"
          >
            <Trash2 size={14} aria-hidden="true" />
            Delete
          </button>
          {editing && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="quack-press quack-focusable rounded-lg border border-hairline px-3 py-2 text-sm text-ink-soft hover:text-ink"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={!draft.title.trim()}
                className="quack-press quack-focusable flex items-center gap-1.5 rounded-lg bg-amber px-4 py-2 text-sm font-semibold text-base disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Check size={14} aria-hidden="true" />
                Save
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ----------------------------- Episode card ----------------------------- */

function EpisodeCard({
  episode,
  onClick,
  onFileClick,
}: {
  episode: Episode
  onClick: () => void
  onFileClick: (path: string) => void
}) {
  const meta = EPISODE_META[episode.type]
  const Icon = meta.icon

  // Using div+role="button" instead of <button> so that the interactive
  // FileChip buttons inside are valid HTML (no nested buttons).
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      className="quack-rise quack-press quack-focusable w-full cursor-pointer rounded-xl border bg-surface p-4 text-left"
      style={{ borderColor: meta.tintBorder }}
    >
      <div className="flex items-start gap-3">
        <span
          className="flex h-8 w-8 flex-none items-center justify-center rounded-lg"
          style={{ backgroundColor: meta.tintBg, color: meta.color }}
        >
          <Icon size={16} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <span
              className="text-[11px] font-medium uppercase tracking-wider"
              style={{ color: meta.color }}
            >
              {meta.label}
            </span>
            <time
              className="flex-none font-mono text-[11px] text-ink-muted"
              dateTime={episode.createdAt}
            >
              {relativeTime(episode.createdAt)}
            </time>
          </div>
          <h3 className="mt-0.5 text-sm font-semibold text-ink">
            {episode.title}
          </h3>
          {episode.details && (
            <p className="mt-1 truncate text-sm text-ink-muted">
              {episode.details}
            </p>
          )}
          {(episode.files.length > 0 || episode.packages.length > 0) && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {episode.files.map((f) => (
                <FileChip key={`f-${f}`} path={f} onFileClick={onFileClick} />
              ))}
              {episode.packages.map((p) => (
                <Chip key={`p-${p}`}>{p}</Chip>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------ Memory panel ---------------------------- */

type FilterId = 'all' | EpisodeType

const FILTERS: { id: FilterId; label: string }[] = [
  { id: 'all', label: 'All' },
  ...EPISODE_TYPES.map((t) => ({ id: t, label: EPISODE_META[t].label })),
]

export function MemoryPanel({ project }: { project: string }) {
  const stored = useStoredEpisodes(project)
  const [filter, setFilter] = useState<FilterId>('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Episode | null>(null)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)

  // On first load per project, write seed episodes into localStorage so they
  // are persistent and editable like any other episode.
  useEffect(() => {
    seedIfEmpty(project, SEED_EPISODES)
  }, [project])

  const all = useMemo(() => {
    const copy = [...stored]
    copy.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    return copy
  }, [stored])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return all.filter((ep) => {
      if (filter !== 'all' && ep.type !== filter) return false
      if (!q) return true
      const hay = [ep.title, ep.details, ep.files.join(' '), ep.packages.join(' ')]
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [all, filter, search])

  // Open file history, closing any open episode modal first.
  const openFile = useCallback((path: string) => {
    setSelected(null)
    setSelectedFile(path)
  }, [])

  return (
    <div className="p-5 sm:p-6">
      {/* Controls */}
      <div className="quack-rise flex flex-col gap-3">
        <div className="relative">
          <Search
            size={15}
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            spellCheck={false}
            placeholder="Search title, details, files, or packages"
            aria-label="Search memory"
            className="quack-focusable w-full rounded-lg border border-hairline bg-surface py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-muted focus:border-amber/50"
          />
        </div>

        <div
          role="group"
          aria-label="Filter by type"
          className="flex flex-wrap gap-2"
        >
          {FILTERS.map((f) => {
            const active = filter === f.id
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                aria-pressed={active}
                className={`quack-press quack-focusable rounded-full border px-3 py-1.5 text-xs font-medium ${
                  active
                    ? 'border-amber/50 bg-amber-soft text-ink'
                    : 'border-hairline bg-surface text-ink-muted hover:text-ink-soft'
                }`}
              >
                {f.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Feed */}
      <div className="mt-5">
        {visible.length === 0 ? (
          <p className="quack-fade py-10 text-center text-sm text-ink-muted">
            No episodes match your search.
          </p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {visible.map((ep, i) => (
              <EpisodeCard
                key={`${ep.createdAt}-${ep.title}-${i}`}
                episode={ep}
                onClick={() => setSelected(ep)}
                onFileClick={openFile}
              />
            ))}
          </div>
        )}
      </div>

      {selected && (
        <EpisodeDetailModal
          episode={selected}
          project={project}
          onClose={() => setSelected(null)}
          onFileClick={openFile}
        />
      )}

      {selectedFile !== null && (
        <FileHistoryPanel
          path={selectedFile}
          project={project}
          onClose={() => setSelectedFile(null)}
          onEpisodeClick={(ep) => {
            setSelectedFile(null)
            setSelected(ep)
          }}
        />
      )}
    </div>
  )
}
