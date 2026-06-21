import { useCallback, useRef, useState } from 'react'
import { Check, ChevronDown, PenLine, AlertCircle } from 'lucide-react'
import { remember, type Episode, type EpisodeType } from '../lib/quack'
import { EPISODE_META, EPISODE_TYPES } from '../lib/episode-meta'
import { addEpisode } from '../lib/episode-store'

/* ---------------------------------------------------------------------------
   Remember tab. Capture a decision, bug, or dependency and persist it to the
   shared episode store so it appears in the Memory feed immediately.
--------------------------------------------------------------------------- */

function splitList(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

export function RememberPanel({ project }: { project: string }) {
  const [type, setType] = useState<EpisodeType>('decision')
  const [title, setTitle] = useState('')
  const [details, setDetails] = useState('')
  const [files, setFiles] = useState('')
  const [packages, setPackages] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState(false)

  const confirmTimer = useRef<number | undefined>(undefined)

  const canSave = title.trim().length > 0 && !saving

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!title.trim() || saving) return
      setSaving(true)
      setError(false)
      setConfirmed(false)
      const episode: Episode = {
        type,
        title: title.trim(),
        details: details.trim(),
        files: splitList(files),
        packages: splitList(packages),
        createdAt: new Date().toISOString(),
      }
      try {
        const saved = await remember(project, episode)
        addEpisode(project, saved)
        // Reset the form.
        setType('decision')
        setTitle('')
        setDetails('')
        setFiles('')
        setPackages('')
        setConfirmed(true)
        window.clearTimeout(confirmTimer.current)
        confirmTimer.current = window.setTimeout(
          () => setConfirmed(false),
          3200,
        )
      } catch {
        setError(true)
      } finally {
        setSaving(false)
      }
    },
    [project, type, title, details, files, packages, saving],
  )

  const fieldClass =
    'quack-focusable w-full rounded-lg border border-hairline bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-amber/50'
  const labelClass =
    'mb-1.5 block font-mono text-[11px] uppercase tracking-wider text-ink-muted'

  return (
    <form onSubmit={onSubmit} className="p-5 sm:p-6">
      <div className="quack-rise flex flex-col gap-4">
        {/* Type */}
        <div>
          <label htmlFor="remember-type" className={labelClass}>
            Type
          </label>
          <div className="relative">
            <select
              id="remember-type"
              value={type}
              onChange={(e) => setType(e.target.value as EpisodeType)}
              className={`${fieldClass} appearance-none pr-9`}
            >
              {EPISODE_TYPES.map((t) => (
                <option key={t} value={t} className="bg-surface-high">
                  {EPISODE_META[t].label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={15}
              aria-hidden="true"
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted"
            />
          </div>
        </div>

        {/* Title */}
        <div>
          <label htmlFor="remember-title" className={labelClass}>
            Title
          </label>
          <input
            id="remember-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            spellCheck={false}
            placeholder="A short, searchable summary"
            className={fieldClass}
          />
        </div>

        {/* Details */}
        <div>
          <label htmlFor="remember-details" className={labelClass}>
            Details
          </label>
          <textarea
            id="remember-details"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={4}
            spellCheck={false}
            placeholder="What happened, why it matters, and what you decided."
            className={`${fieldClass} resize-y leading-relaxed`}
          />
        </div>

        {/* Files + packages */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="remember-files" className={labelClass}>
              Files
            </label>
            <input
              id="remember-files"
              type="text"
              value={files}
              onChange={(e) => setFiles(e.target.value)}
              spellCheck={false}
              placeholder="src/cache.ts, src/api.ts"
              className={`${fieldClass} font-mono`}
            />
            <p className="mt-1 text-[11px] text-ink-muted">Comma separated</p>
          </div>
          <div>
            <label htmlFor="remember-packages" className={labelClass}>
              Packages
            </label>
            <input
              id="remember-packages"
              type="text"
              value={packages}
              onChange={(e) => setPackages(e.target.value)}
              spellCheck={false}
              placeholder="p-memoize, lru-cache"
              className={`${fieldClass} font-mono`}
            />
            <p className="mt-1 text-[11px] text-ink-muted">Comma separated</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3">
          <div aria-live="polite" className="min-h-[1.25rem]">
            {confirmed && (
              <span className="quack-fade inline-flex items-center gap-1.5 text-sm font-medium text-[#46c98b]">
                <Check size={15} aria-hidden="true" />
                Quack will remember this.
              </span>
            )}
            {error && (
              <span className="quack-fade inline-flex items-center gap-1.5 text-sm font-medium text-bug">
                <AlertCircle size={15} aria-hidden="true" />
                Could not save. Please try again.
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={!canSave}
            className={`quack-press quack-focusable inline-flex items-center gap-2 rounded-lg bg-amber px-4 py-2 text-sm font-semibold text-base disabled:cursor-not-allowed disabled:opacity-40 ${
              canSave ? 'quack-amber-glow' : ''
            }`}
          >
            <PenLine size={15} aria-hidden="true" />
            {saving ? 'Saving...' : 'Remember'}
          </button>
        </div>
      </div>
    </form>
  )
}
