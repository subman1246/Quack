import { useCallback, useRef, useState } from 'react'
import { Check, ChevronDown, PenLine, AlertCircle, Sparkles } from 'lucide-react'
import { remember, type Episode, type EpisodeType } from '../lib/quack'
import { EPISODE_META, EPISODE_TYPES } from '../lib/episode-meta'
import { addEpisode } from '../lib/episode-store'

/* ---------------------------------------------------------------------------
   Remember tab. Capture a decision, bug, or dependency and persist it to the
   shared episode store so it appears in the Memory feed immediately.

   Smart capture sits at the top: paste a raw error or note and Quack drafts
   the fields locally, on the client, with no backend call. The user still
   reviews every field and submits with the existing Remember button.
--------------------------------------------------------------------------- */

function splitList(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

/* --------------------------- Smart capture parsing ---------------------- */

const BUG_HINTS = /error|exception|traceback|stack|failed|throw/i
const DECISION_HINTS = /chose|decided|decision|rejected|instead of|we went with/i
const DEP_HINTS = /upgrade|bump|version|dependency/i
/** A name directly before an @version, e.g. p-memoize@7 or react@^18. */
const NAME_AT_VERSION = /[a-z0-9][\w./-]*@\^?~?=?v?\d/i

/** Classify the pasted text into an episode type. First match wins. */
function detectType(text: string): EpisodeType {
  if (BUG_HINTS.test(text)) return 'bug'
  if (DECISION_HINTS.test(text)) return 'decision'
  if (DEP_HINTS.test(text) || NAME_AT_VERSION.test(text)) return 'dependency'
  return 'bug'
}

/** A cleaned short summary from the first meaningful line, capped near 60. */
function draftTitle(text: string): string {
  const line =
    text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find((l) => l.length > 0) ?? ''
  const cleaned = line.replace(/\s+/g, ' ').trim()
  if (cleaned.length <= 60) return cleaned
  const cut = cleaned.slice(0, 60)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trim()}...`
}

/** Pull path-like tokens: src/ paths or files ending in ts/tsx/js/jsx/py. */
function extractFiles(text: string): string[] {
  const found = new Set<string>()
  const patterns = [
    /(?:[A-Za-z0-9_.-]+\/)*[A-Za-z0-9_.-]+\.(?:tsx?|jsx?|py)\b/g,
    /\bsrc\/[A-Za-z0-9_./-]+/g,
  ]
  for (const re of patterns) {
    for (const m of text.matchAll(re)) {
      const token = m[0].replace(/[).,:;]+$/, '')
      if (token) found.add(token)
    }
  }
  return [...found]
}

/** Pull package-like tokens: names before an @version, plus scoped or
 *  hyphenated lowercase names. May be empty. */
function extractPackages(text: string): string[] {
  const found = new Set<string>()
  const versioned =
    /(@?[a-z0-9][a-z0-9._-]*(?:\/[a-z0-9._-]+)?)@\^?~?=?v?\d[\w.-]*/gi
  for (const m of text.matchAll(versioned)) {
    found.add(m[1].toLowerCase())
  }
  const nameLike = /@?[a-z][a-z0-9.]*(?:[-/][a-z0-9.]+)+/g
  for (const m of text.matchAll(nameLike)) {
    const token = m[0]
    // Skip file paths and non-scoped slashed tokens; they are not packages.
    if (/\.(?:tsx?|jsx?|py|json|css|md|html|lock)$/i.test(token)) continue
    if (token.includes('/') && !token.startsWith('@')) continue
    found.add(token.toLowerCase())
  }
  return [...found]
}

export function RememberPanel({ project }: { project: string }) {
  const [capture, setCapture] = useState('')
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

  /** Draft the form fields from the pasted text, entirely on the client. */
  const onDraft = useCallback(() => {
    const text = capture.trim()
    if (!text) return
    setType(detectType(text))
    setTitle(draftTitle(text))
    setDetails(text)
    setFiles(extractFiles(text).join(', '))
    setPackages(extractPackages(text).join(', '))
  }, [capture])

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
        setCapture('')
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
        {/* Smart capture: draft the fields from a pasted error or note,
            entirely on the client. The user reviews and edits below. */}
        <div className="rounded-xl border border-hairline bg-surface p-4">
          <div className="mb-2 flex items-center gap-2 text-amber">
            <Sparkles size={14} aria-hidden="true" />
            <span className="font-mono text-[11px] uppercase tracking-wider">
              Smart capture
            </span>
          </div>
          <label htmlFor="remember-capture" className="sr-only">
            Paste a raw error or note
          </label>
          <textarea
            id="remember-capture"
            value={capture}
            onChange={(e) => setCapture(e.target.value)}
            rows={3}
            spellCheck={false}
            placeholder="Paste a raw error or note"
            className={`${fieldClass} resize-y leading-relaxed`}
          />
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2.5">
            <p className="text-[11px] text-ink-muted">
              Drafting happens locally. Review the fields below before saving.
            </p>
            <button
              type="button"
              onClick={onDraft}
              disabled={!capture.trim()}
              className="quack-press quack-focusable inline-flex items-center gap-2 rounded-lg border border-amber/30 bg-amber-soft px-3.5 py-2 text-sm font-medium text-ink disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Sparkles size={14} aria-hidden="true" />
              Draft with Quack
            </button>
          </div>
        </div>

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
