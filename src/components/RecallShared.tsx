import { useId, useLayoutEffect, useRef, useState } from 'react'
import {
  Check,
  CloudOff,
  Copy,
  Eye,
  EyeOff,
  FileText,
  History,
  HelpCircle,
  MessageSquare,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import type { Citation, RecallResult } from '../lib/quack'

/* ---------------------------------------------------------------------------
   Shared recall-result primitives used by both RecallPanel and
   FileHistoryPanel. Extracted to avoid a circular import between the two.
--------------------------------------------------------------------------- */

/* ------------------------------------------------------------------ */
/*  Confidence gauge                                                    */
/* ------------------------------------------------------------------ */

export function gradeOf(pct: number): { color: string; label: string } {
  if (pct >= 70) return { color: '#46c98b', label: 'High confidence' }
  if (pct >= 40) return { color: 'var(--color-amber)', label: 'Medium confidence' }
  return { color: 'var(--color-bug)', label: 'Low confidence' }
}

const GAUGE_R = 54
const GAUGE_C = 2 * Math.PI * GAUGE_R
const GAUGE_ARC = 0.75
const GAUGE_TRACK = GAUGE_C * GAUGE_ARC

export function ConfidenceGauge({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const { color, label } = gradeOf(pct)
  const fillRef = useRef<SVGCircleElement>(null)

  useLayoutEffect(() => {
    const el = fillRef.current
    if (!el) return
    el.style.strokeDashoffset = String(GAUGE_TRACK)
    const target = GAUGE_TRACK - GAUGE_TRACK * (pct / 100)
    const id = window.requestAnimationFrame(() =>
      window.requestAnimationFrame(() => {
        el.style.strokeDashoffset = String(target)
      }),
    )
    return () => window.cancelAnimationFrame(id)
  }, [pct])

  return (
    <div
      className="flex flex-col items-center"
      role="img"
      aria-label={`${pct} percent, ${label}`}
    >
      <div className="relative h-[140px] w-[140px]">
        <svg viewBox="0 0 140 140" className="h-full w-full">
          {/* Track */}
          <circle
            cx="70"
            cy="70"
            r={GAUGE_R}
            fill="none"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${GAUGE_TRACK} ${GAUGE_C}`}
            transform="rotate(135 70 70)"
          />
          {/* Fill */}
          <circle
            ref={fillRef}
            cx="70"
            cy="70"
            r={GAUGE_R}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${GAUGE_TRACK} ${GAUGE_C}`}
            strokeDashoffset={GAUGE_TRACK}
            transform="rotate(135 70 70)"
            style={{
              transition:
                'stroke-dashoffset 1s var(--ease-out-soft), stroke 0.4s ease',
              filter: `drop-shadow(0 0 6px ${color})`,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-mono text-3xl font-semibold tabular-nums"
            style={{ color }}
          >
            {pct}
            <span className="text-lg">%</span>
          </span>
        </div>
      </div>
      <span className="mt-1 text-xs font-medium text-ink-soft">{label}</span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Citation card                                                       */
/* ------------------------------------------------------------------ */

interface SourceMeta {
  label: string
  icon: LucideIcon
  color: string
  tintBg: string
  tintBorder: string
}

const NEUTRAL_SOURCE: SourceMeta = {
  label: 'Source',
  icon: HelpCircle,
  color: 'var(--color-ink-soft)',
  tintBg: 'rgba(255,255,255,0.06)',
  tintBorder: 'rgba(255,255,255,0.12)',
}

const SOURCE_META: Record<string, SourceMeta> = {
  session: {
    label: 'Session',
    icon: MessageSquare,
    color: 'var(--color-ink-soft)',
    tintBg: 'rgba(255,255,255,0.06)',
    tintBorder: 'rgba(255,255,255,0.12)',
  },
  file: {
    label: 'File',
    icon: FileText,
    color: 'var(--color-ink-soft)',
    tintBg: 'rgba(255,255,255,0.06)',
    tintBorder: 'rgba(255,255,255,0.12)',
  },
}

function getSourceMeta(type: string | undefined): SourceMeta {
  if (!type) return NEUTRAL_SOURCE
  const known = SOURCE_META[type]
  if (known) return known
  return {
    ...NEUTRAL_SOURCE,
    label: type.charAt(0).toUpperCase() + type.slice(1),
  }
}

/**
 * A citation chip that copies the id to clipboard by default. When onOpen is
 * provided (used for file-type citations) clicking opens the file history
 * panel instead, and the trailing icon changes to a History glyph.
 */
export function CitationCard({
  citation,
  onCopy,
  onOpen,
}: {
  citation: Citation
  onCopy: (id: string) => void
  onOpen?: () => void
}) {
  const meta = getSourceMeta(citation.type)
  const Icon = meta.icon
  const isFile = !!onOpen

  return (
    <button
      type="button"
      onClick={() => (isFile ? onOpen() : onCopy(citation.id))}
      title={isFile ? 'View file history' : `Copy ${citation.id}`}
      aria-label={
        isFile
          ? `View file history for ${citation.id}`
          : `Copy ${citation.id}`
      }
      className="quack-press quack-focusable group flex items-center gap-2.5 rounded-xl border bg-surface px-3 py-2.5 text-left"
      style={{ borderColor: meta.tintBorder }}
    >
      <span
        className="flex h-7 w-7 flex-none items-center justify-center rounded-lg"
        style={{ backgroundColor: meta.tintBg, color: meta.color }}
      >
        <Icon size={15} aria-hidden="true" />
      </span>
      <span className="min-w-0 leading-tight">
        <span
          className="block text-[11px] font-medium uppercase tracking-wider"
          style={{ color: meta.color }}
        >
          {meta.label}
        </span>
        <span className="block truncate font-mono text-xs text-ink-soft">
          {citation.id}
        </span>
      </span>
      {isFile ? (
        <History
          size={13}
          aria-hidden="true"
          className="ml-auto flex-none text-ink-muted opacity-0 transition-opacity group-hover:opacity-100"
        />
      ) : (
        <Copy
          size={13}
          aria-hidden="true"
          className="ml-auto flex-none text-ink-muted opacity-0 transition-opacity group-hover:opacity-100"
        />
      )}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/*  Recall result view                                                  */
/*                                                                      */
/*  Shared answer reveal + confidence gauge + citation chips, used by   */
/*  Recall, File History, and Upgrade so they all behave the same way.  */
/*  Below a confidence of 0.4 the answer is not presented as fact: a    */
/*  calm note is shown with a toggle that reveals the weak answer and    */
/*  its citations only when the user asks for them. At or above 0.4 the  */
/*  result renders exactly as before.                                    */
/* ------------------------------------------------------------------ */

/** Confidence floor below which an answer is treated as a faint memory. */
export const LOW_CONFIDENCE = 0.4

export function RecallResultView({
  result,
  layout = 'split',
  citationGrid = 'wide',
  onCopyAnswer,
  onCopyCitation,
  onOpenFile,
}: {
  result: RecallResult
  /** 'split' places the gauge beside the answer; 'stacked' below it. */
  layout?: 'split' | 'stacked'
  /** 'wide' uses a responsive multi-column citation grid; 'single' a column. */
  citationGrid?: 'wide' | 'single'
  /** Copy the answer text. Resolves true on success so the check icon shows. */
  onCopyAnswer: (text: string) => Promise<boolean>
  /** Copy a citation id. */
  onCopyCitation: (id: string) => void
  /** When provided, file-type citations open file history instead of copying. */
  onOpenFile?: (path: string) => void
}) {
  const [answerCopied, setAnswerCopied] = useState(false)
  const [showWeak, setShowWeak] = useState(false)
  const weakRegionId = useId()

  // Reset transient state when a new result arrives (state-during-render).
  const [prevResult, setPrevResult] = useState(result)
  if (prevResult !== result) {
    setPrevResult(result)
    setAnswerCopied(false)
    setShowWeak(false)
  }

  const lowConfidence = result.confidence < LOW_CONFIDENCE
  const reveal = !lowConfidence || showWeak

  async function copyAnswer() {
    const ok = await onCopyAnswer(result.answer)
    if (ok) {
      setAnswerCopied(true)
      window.setTimeout(() => setAnswerCopied(false), 1600)
    }
  }

  const copyButton = (
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
  )

  const answerBody = (
    <div className="mt-2 flex items-start gap-2">
      <p className="flex-1 text-sm leading-relaxed text-ink-soft">
        {result.answer}
      </p>
      {copyButton}
    </div>
  )

  const answerBlock = (
    <div className="quack-rise min-w-0">
      {lowConfidence ? (
        <>
          <div className="flex items-center gap-1.5 text-ink-muted">
            <CloudOff size={13} aria-hidden="true" />
            <span className="font-mono text-[11px] uppercase tracking-wider">
              Faint memory
            </span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            Quack does not have a strong memory of this yet.
          </p>
          <button
            type="button"
            onClick={() => setShowWeak((v) => !v)}
            aria-expanded={showWeak}
            aria-controls={weakRegionId}
            className="quack-press quack-focusable mt-3 inline-flex items-center gap-1.5 rounded-lg border border-hairline bg-surface px-3 py-1.5 text-xs text-ink-soft hover:text-ink"
          >
            {showWeak ? (
              <EyeOff size={13} aria-hidden="true" />
            ) : (
              <Eye size={13} aria-hidden="true" />
            )}
            {showWeak ? 'Hide what I found' : 'Show what I found anyway'}
          </button>
          {showWeak && (
            <div id={weakRegionId} className="quack-fade">
              {answerBody}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex items-center gap-1.5 text-amber">
            <Sparkles size={13} aria-hidden="true" />
            <span className="font-mono text-[11px] uppercase tracking-wider">
              Quack remembers
            </span>
          </div>
          {answerBody}
        </>
      )}
    </div>
  )

  const showCitations = reveal && result.citations.length > 0
  const citationsBlock = (
    <div className="quack-rise mt-6" style={{ animationDelay: '0.12s' }}>
      <p className="mb-2.5 font-mono text-[11px] uppercase tracking-wider text-ink-muted">
        Cited episodes
      </p>
      <div
        className={
          citationGrid === 'wide'
            ? 'grid gap-2 sm:grid-cols-2 lg:grid-cols-3'
            : 'grid gap-2'
        }
      >
        {result.citations.map((c) => (
          <CitationCard
            key={c.id}
            citation={c}
            onCopy={(id) => onCopyCitation(id)}
            onOpen={
              onOpenFile && c.type === 'file'
                ? () => onOpenFile(c.id)
                : undefined
            }
          />
        ))}
      </div>
    </div>
  )

  if (layout === 'stacked') {
    return (
      <div>
        {answerBlock}
        <div
          className="quack-rise mt-5 flex justify-center"
          style={{ animationDelay: '0.08s' }}
        >
          <ConfidenceGauge value={result.confidence} />
        </div>
        {showCitations && citationsBlock}
      </div>
    )
  }

  return (
    <div>
      <div className="grid gap-6 sm:grid-cols-[1fr_auto] sm:items-start">
        {answerBlock}
        <div
          className="quack-rise flex justify-center sm:justify-end"
          style={{ animationDelay: '0.08s' }}
        >
          <ConfidenceGauge value={result.confidence} />
        </div>
      </div>
      {showCitations && citationsBlock}
    </div>
  )
}
