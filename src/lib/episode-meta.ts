import { Bug, GitBranch, Package, type LucideIcon } from 'lucide-react'
import type { EpisodeType } from './quack'

/* ---------------------------------------------------------------------------
   Central mapping of episode type to its fixed icon, label, and color token.
   Keeping this in one place means the bug, decision, and dependency styling
   stays consistent everywhere it appears.
--------------------------------------------------------------------------- */

export interface EpisodeMeta {
  label: string
  icon: LucideIcon
  /** CSS color value for the type. */
  color: string
  /** Tailwind text color utility. */
  textClass: string
  /** Translucent tinted background. */
  tintBg: string
  /** Translucent tinted border. */
  tintBorder: string
}

export const EPISODE_META: Record<EpisodeType, EpisodeMeta> = {
  bug: {
    label: 'Bug',
    icon: Bug,
    color: 'var(--color-bug)',
    textClass: 'text-bug',
    tintBg: 'rgba(242, 97, 91, 0.12)',
    tintBorder: 'rgba(242, 97, 91, 0.35)',
  },
  decision: {
    label: 'Decision',
    icon: GitBranch,
    color: 'var(--color-decision)',
    textClass: 'text-decision',
    tintBg: 'rgba(124, 131, 247, 0.12)',
    tintBorder: 'rgba(124, 131, 247, 0.35)',
  },
  dependency: {
    label: 'Dependency',
    icon: Package,
    color: 'var(--color-dependency)',
    textClass: 'text-dependency',
    tintBg: 'rgba(245, 182, 66, 0.12)',
    tintBorder: 'rgba(245, 182, 66, 0.35)',
  },
}

export const EPISODE_TYPES: EpisodeType[] = ['decision', 'bug', 'dependency']
