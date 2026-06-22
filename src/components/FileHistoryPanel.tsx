import { useCallback, useEffect, useState } from 'react'
import { Check, Copy, Sparkles, X } from 'lucide-react'
import { recall, type Episode, type RecallResult } from '../lib/quack'
import { useStoredEpisodes } from '../lib/episode-store'
import { EPISODE_META } from '../lib/episode-meta'
import { ConfidenceGauge, CitationCard } from './RecallShared'

/* ---------------------------------------------------------------------------
   File History slide-over. Opens when a file chip is clicked anywhere in the
   app. Two sections:
     1. Quack's take -- recall result for a file-scoped query.
     2. Episodes touching this file -- compact cards from local memory.
--------------------------------------------------------------------------- */

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

export function FileHistoryPanel({
  path,
  project,
  onClose,
  onEpisodeClick,
}: {
  path: string
  project: string
  onClose: () => void
  onEpisodeClick: (episode: Episode) => void
}) {
  const [result, setResult] = useState<RecallResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [answerCopied, setAnswerCopied] = useState(false)

  const allEpisodes = useStoredEpisodes(project)
  const touching = allEpisodes
    .filter((ep) => ep.files.includes(path))
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )

  // Run recall for this file path on mount and whenever path or project changes.
  useEffect(() => {
    let active = true
    setLoading(true)
    setResult(null)
    setHasError(false)
    recall(
      project,
      `Summarize everything that has happened with the file ${path}, including decisions, bug fixes, and dependency issues, and explain why the code is the way it is.`,
    )
      .then((res) => {
        if (active) setResult(res)
      })
      .catch(() => {
        if (active) setHasError(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [path, project])

  // Escape closes the panel.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const copyAnswer = useCallback(async () => {
    if (!result) return
    try {
      await navigator.clipboard.writeText(result.answer)
      setAnswerCopied(true)
      window.setTimeout(() => setAnswerCopied(false), 1600)
    } catch {
      // Clipboard unavailable -- silently skip.
    }
  }, [result])

  return (
    <>
      {/* Backdrop -- clicking outside closes the panel */}
      <div
        className="quack-fade fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`File history: ${path}`}
        className="quack-slide-in-right fixed inset-y-0 right-0 z-[41] flex w-full max-w-lg flex-col overflow-y-auto border-l border-hairline bg-surface"
      >
        {/* Header */}
        <div className="flex flex-none items-start gap-3 border-b border-hairline px-5 py-4">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
              File
            </p>
            <h2 className="mt-0.5 break-all font-mono text-sm font-semibold leading-snug text-ink">
              {path}
            </h2>
          </div>
          <button
            type="button"
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            onClick={onClose}
            aria-label="Close file history"
            className="quack-press quack-focusable mt-0.5 flex-none rounded-lg p-1.5 text-ink-muted hover:text-ink"
          >
            <X size={16} />
          </button>
        </div>

        {/* Section 1: Quack's take on this file */}
        <div className="border-b border-hairline px-5 py-5">
          <p className="mb-4 font-mono text-[11px] uppercase tracking-wider text-ink-muted">
            Quack's take on this file
          </p>

          {loading && (
            <div
              className="quack-fade flex flex-col items-center py-8"
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

          {hasError && !loading && (
            <p className="py-4 text-sm text-ink-muted">
              Could not load file history. Check your connection.
            </p>
          )}

          {!loading && result && (
            <div className="quack-rise">
              {/* Answer */}
              <div className="flex items-center gap-1.5 text-amber">
                <Sparkles size={13} aria-hidden="true" />
                <span className="font-mono text-[11px] uppercase tracking-wider">
                  Quack remembers
                </span>
              </div>
              <div className="mt-2 flex items-start gap-2">
                <p className="flex-1 text-sm leading-relaxed text-ink-soft">
                  {result.answer}
                </p>
                <button
                  type="button"
                  onClick={copyAnswer}
                  aria-label="Copy answer"
                  title="Copy answer"
                  className="quack-press quack-focusable flex-none rounded-lg border border-hairline bg-surface-high p-1.5 text-ink-muted hover:text-ink"
                >
                  {answerCopied ? (
                    <Check size={14} className="text-[#46c98b]" />
                  ) : (
                    <Copy size={14} />
                  )}
                </button>
              </div>

              {/* Confidence gauge */}
              <div
                className="quack-rise mt-5 flex justify-center"
                style={{ animationDelay: '0.08s' }}
              >
                <ConfidenceGauge value={result.confidence} />
              </div>

              {/* Citations */}
              {result.citations.length > 0 && (
                <div
                  className="quack-rise mt-5"
                  style={{ animationDelay: '0.12s' }}
                >
                  <p className="mb-2.5 font-mono text-[11px] uppercase tracking-wider text-ink-muted">
                    Cited episodes
                  </p>
                  <div className="grid gap-2">
                    {result.citations.map((c) => (
                      <CitationCard
                        key={c.id}
                        citation={c}
                        onCopy={async (id) => {
                          try {
                            await navigator.clipboard.writeText(id)
                          } catch {
                            // Clipboard unavailable.
                          }
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section 2: Episodes touching this file */}
        <div className="px-5 py-5">
          <p className="mb-4 font-mono text-[11px] uppercase tracking-wider text-ink-muted">
            Episodes touching this file
          </p>

          {touching.length === 0 ? (
            <p className="py-4 text-center text-sm text-ink-muted">
              No recorded episodes reference this file.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {touching.map((ep, i) => {
                const meta = EPISODE_META[ep.type]
                const Icon = meta.icon
                return (
                  <button
                    key={`${ep.createdAt}-${i}`}
                    type="button"
                    onClick={() => onEpisodeClick(ep)}
                    className="quack-press quack-focusable w-full rounded-xl border bg-surface-high p-3 text-left"
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
      </aside>
    </>
  )
}
