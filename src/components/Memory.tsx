import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import type { Episode, EpisodeType } from '../lib/quack'
import { EPISODE_META, EPISODE_TYPES } from '../lib/episode-meta'
import { useStoredEpisodes } from '../lib/episode-store'

/* ---------------------------------------------------------------------------
   Memory tab. A searchable, filterable feed of episode cards. Combines user
   logged episodes from the store with a set of seed cards so it is never empty.
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

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md border border-hairline bg-surface px-1.5 py-0.5 font-mono text-[11px] text-ink-muted">
      {children}
    </span>
  )
}

function EpisodeCard({ episode }: { episode: Episode }) {
  const meta = EPISODE_META[episode.type]
  const Icon = meta.icon
  return (
    <article
      className="quack-rise rounded-xl border bg-surface p-4"
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
                <Chip key={`f-${f}`}>{f}</Chip>
              ))}
              {episode.packages.map((p) => (
                <Chip key={`p-${p}`}>{p}</Chip>
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

type FilterId = 'all' | EpisodeType

const FILTERS: { id: FilterId; label: string }[] = [
  { id: 'all', label: 'All' },
  ...EPISODE_TYPES.map((t) => ({ id: t, label: EPISODE_META[t].label })),
]

export function MemoryPanel({ project }: { project: string }) {
  const stored = useStoredEpisodes(project)
  const [filter, setFilter] = useState<FilterId>('all')
  const [search, setSearch] = useState('')

  const all = useMemo(() => {
    const combined = [...stored, ...SEED_EPISODES]
    combined.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    return combined
  }, [stored])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return all.filter((ep) => {
      if (filter !== 'all' && ep.type !== filter) return false
      if (!q) return true
      const hay = [
        ep.title,
        ep.details,
        ep.files.join(' '),
        ep.packages.join(' '),
      ]
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [all, filter, search])

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
              <EpisodeCard key={`${ep.createdAt}-${ep.title}-${i}`} episode={ep} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
