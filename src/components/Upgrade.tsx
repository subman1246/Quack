import { useCallback, useMemo, useState } from 'react'
import { ArrowUpCircle, ShieldAlert, ShieldCheck } from 'lucide-react'
import { recall, type Episode, type RecallResult } from '../lib/quack'
import { useStoredEpisodes } from '../lib/episode-store'
import { EPISODE_META } from '../lib/episode-meta'
import { RecallResultView } from './RecallShared'
import { FileHistoryPanel } from './FileHistoryPanel'
import { EpisodeDetailModal } from './Memory'

/* ---------------------------------------------------------------------------
   Upgrade tab. Before bumping a dependency, check whether it has caused
   problems before. Asks Quack through the bridge, derives a plain verdict
   banner from the result, and lists any local dependency episodes that name
   the package so past scars are one click from their full detail view.
--------------------------------------------------------------------------- */

const SUGGESTED = ['p-memoize', 'zod']

/** Confidence at or above this, with at least one citation, earns a warning. */
const SCAR_CONFIDENCE = 0.5

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

/** Build the recall query, folding in the version range only when given. */
function buildQuery(pkg: string, from: string, to: string): string {
  const f = from.trim()
  const t = to.trim()
  let range = ''
  if (f && t) range = ` when upgrading from ${f} to ${t}`
  else if (f) range = ` when upgrading from ${f}`
  else if (t) range = ` when upgrading to ${t}`
  return `Have we had any problems with the package ${pkg}${range}? What broke and how was it fixed, and should I be careful upgrading it?`
}

export function UpgradePanel({ project }: { project: string }) {
  const [pkg, setPkg] = useState('')
  const [fromV, setFromV] = useState('')
  const [toV, setToV] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<RecallResult | null>(null)
  const [hasError, setHasError] = useState(false)
  // The package name the current view was checked against.
  const [checkedPkg, setCheckedPkg] = useState('')

  // File history slide-over + episode detail, opened from cards or citations.
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null)

  const stored = useStoredEpisodes(project)

  const runCheck = useCallback(
    async (rawPkg: string) => {
      const name = rawPkg.trim()
      if (!name || loading) return
      setLoading(true)
      setResult(null)
      setHasError(false)
      setCheckedPkg(name)
      try {
        const res = await recall(project, buildQuery(name, fromV, toV))
        setResult(res)
      } catch {
        setHasError(true)
      } finally {
        setLoading(false)
      }
    },
    [project, fromV, toV, loading],
  )

  const onSuggested = useCallback(
    (name: string) => {
      setPkg(name)
      runCheck(name)
    },
    [runCheck],
  )

  function onInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      runCheck(pkg)
    }
  }

  // Local dependency episodes that name the checked package, newest first.
  const pastEpisodes = useMemo(() => {
    const name = checkedPkg.trim().toLowerCase()
    if (!name) return []
    return stored
      .filter(
        (ep) =>
          ep.type === 'dependency' &&
          ep.packages.some((p) => p.toLowerCase() === name),
      )
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
  }, [stored, checkedPkg])

  // A confident answer with at least one citation means recorded scars. A
  // low-confidence result can never trip this, so no confident verdict is
  // shown on a weak memory.
  const hasScars =
    !!result &&
    result.confidence >= SCAR_CONFIDENCE &&
    result.citations.length >= 1

  const fieldClass =
    'quack-focusable w-full rounded-lg border border-hairline bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-amber/50'
  const labelClass =
    'mb-1.5 block font-mono text-[11px] uppercase tracking-wider text-ink-muted'

  return (
    <div className="p-5 sm:p-6">
      {/* Inputs */}
      <div className="quack-rise flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <label htmlFor="upgrade-pkg" className={labelClass}>
            Package
          </label>
          <input
            id="upgrade-pkg"
            type="text"
            value={pkg}
            onChange={(e) => setPkg(e.target.value)}
            onKeyDown={onInputKeyDown}
            spellCheck={false}
            autoComplete="off"
            placeholder="Package name, for example p-memoize"
            className={`${fieldClass} font-mono`}
          />
        </div>
        <div className="flex gap-3">
          <div className="w-24">
            <label htmlFor="upgrade-from" className={labelClass}>
              From version
            </label>
            <input
              id="upgrade-from"
              type="text"
              value={fromV}
              onChange={(e) => setFromV(e.target.value)}
              onKeyDown={onInputKeyDown}
              spellCheck={false}
              autoComplete="off"
              placeholder="4"
              className={`${fieldClass} font-mono`}
            />
          </div>
          <div className="w-24">
            <label htmlFor="upgrade-to" className={labelClass}>
              To version
            </label>
            <input
              id="upgrade-to"
              type="text"
              value={toV}
              onChange={(e) => setToV(e.target.value)}
              onKeyDown={onInputKeyDown}
              spellCheck={false}
              autoComplete="off"
              placeholder="7"
              className={`${fieldClass} font-mono`}
            />
          </div>
        </div>
      </div>

      {/* Suggested packages + Check */}
      <div className="quack-rise mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-ink-muted">Try</span>
          {SUGGESTED.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onSuggested(s)}
              className="quack-press quack-focusable rounded-full border border-hairline bg-surface px-3 py-1.5 font-mono text-xs text-ink-soft hover:border-amber/40 hover:text-ink"
            >
              {s}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => runCheck(pkg)}
          disabled={!pkg.trim() || loading}
          className={`quack-press quack-focusable inline-flex items-center gap-2 rounded-lg bg-amber px-4 py-2 text-sm font-semibold text-base disabled:cursor-not-allowed disabled:opacity-40 ${
            pkg.trim() && !loading ? 'quack-amber-glow' : ''
          }`}
        >
          <ArrowUpCircle size={15} aria-hidden="true" />
          Check
        </button>
      </div>

      {/* Empty state before the first check */}
      {!loading && !checkedPkg && (
        <p className="quack-fade mt-6 text-xs text-ink-muted">
          Check whether a dependency has bitten us before you bump it.
        </p>
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

      {/* Error */}
      {!loading && hasError && (
        <p className="mt-7 text-sm text-ink-muted">
          Could not check this package. Please try again.
        </p>
      )}

      {/* Verdict banner + answer */}
      {!loading && result && (
        <div className="mt-7">
          {hasScars ? (
            <div
              role="status"
              className="quack-rise flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium text-ink"
              style={{
                borderColor: 'rgba(245, 182, 66, 0.35)',
                backgroundColor: 'var(--color-amber-soft)',
              }}
            >
              <ShieldAlert
                size={18}
                aria-hidden="true"
                className="flex-none"
                style={{ color: 'var(--color-amber)' }}
              />
              Quack has scars here, read before you upgrade
            </div>
          ) : (
            <div
              role="status"
              className="quack-rise flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium text-ink"
              style={{
                borderColor: 'rgba(70, 201, 139, 0.3)',
                backgroundColor: 'rgba(70, 201, 139, 0.1)',
              }}
            >
              <ShieldCheck
                size={18}
                aria-hidden="true"
                className="flex-none"
                style={{ color: '#46c98b' }}
              />
              No past issues on record for this package
            </div>
          )}

          <div className="mt-5">
            <RecallResultView
              result={result}
              layout="split"
              onCopyAnswer={async (text) => {
                try {
                  await navigator.clipboard.writeText(text)
                  return true
                } catch {
                  return false
                }
              }}
              onCopyCitation={async (id) => {
                try {
                  await navigator.clipboard.writeText(id)
                } catch {
                  // Clipboard unavailable.
                }
              }}
              onOpenFile={(path) => setSelectedFile(path)}
            />
          </div>
        </div>
      )}

      {/* Past dependency episodes for the checked package */}
      {!loading && checkedPkg && (
        <div className="mt-7 border-t border-hairline pt-5">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-wider text-ink-muted">
            Past dependency episodes
          </p>
          {pastEpisodes.length === 0 ? (
            <p className="py-2 text-sm text-ink-muted">
              No recorded dependency episodes name {checkedPkg}.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {pastEpisodes.map((ep, i) => {
                const meta = EPISODE_META[ep.type]
                const Icon = meta.icon
                return (
                  <button
                    key={`${ep.createdAt}-${i}`}
                    type="button"
                    onClick={() => setSelectedEpisode(ep)}
                    className="quack-press quack-focusable w-full rounded-xl border bg-surface p-3 text-left"
                    style={{ borderColor: meta.tintBorder }}
                  >
                    <div className="flex items-start gap-2.5">
                      <span
                        className="flex h-7 w-7 flex-none items-center justify-center rounded-lg"
                        style={{ backgroundColor: meta.tintBg, color: meta.color }}
                      >
                        <Icon size={14} aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <span
                            className="text-[11px] font-medium uppercase tracking-wider"
                            style={{ color: meta.color }}
                          >
                            {meta.label}
                          </span>
                          <time
                            className="flex-none font-mono text-[11px] text-ink-muted"
                            dateTime={ep.createdAt}
                          >
                            {relativeTime(ep.createdAt)}
                          </time>
                        </div>
                        <p className="mt-0.5 truncate text-sm font-semibold text-ink">
                          {ep.title}
                        </p>
                        {ep.details && (
                          <p className="mt-0.5 line-clamp-2 text-xs text-ink-muted">
                            {ep.details}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

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

      {/* Episode detail */}
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
