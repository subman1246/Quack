import { useLayoutEffect, useRef } from 'react'
import {
  Copy,
  FileText,
  History,
  HelpCircle,
  MessageSquare,
  type LucideIcon,
} from 'lucide-react'
import type { Citation } from '../lib/quack'

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
