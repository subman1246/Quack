/* ---------------------------------------------------------------------------
   Settings store. Persists user preferences to localStorage under the key
   'quack:settings' and exposes helpers consumed by App.tsx and Settings.tsx.
--------------------------------------------------------------------------- */

import { BRIDGE_FALLBACK_URL } from './bridge-url'

export { BRIDGE_FALLBACK_URL }

const SETTINGS_KEY = 'quack:settings'
const RECENT_PROJECTS_KEY = 'quack:recent-projects'

export interface QuackSettings {
  accentColor: string
  density: 'comfortable' | 'compact'
  reduceMotion: boolean
  splashOnLaunch: boolean
  bridgeUrlOverride: string
}

export const SETTINGS_DEFAULTS: QuackSettings = {
  accentColor: '#f5b642',
  density: 'comfortable',
  reduceMotion: false,
  splashOnLaunch: true,
  bridgeUrlOverride: '',
}

export const ACCENT_PRESETS: { label: string; hex: string }[] = [
  { label: 'Amber', hex: '#f5b642' },
  { label: 'Indigo', hex: '#7c83f7' },
  { label: 'Emerald', hex: '#46c98b' },
  { label: 'Rose', hex: '#f2615b' },
  { label: 'Violet', hex: '#a78bfa' },
]

export function loadSettings(): QuackSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return { ...SETTINGS_DEFAULTS }
    return { ...SETTINGS_DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return { ...SETTINGS_DEFAULTS }
  }
}

export function saveSettings(settings: QuackSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {}
}

export function loadRecentProjects(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_PROJECTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed)
      ? parsed.filter((s) => typeof s === 'string')
      : []
  } catch {
    return []
  }
}

export function pushRecentProject(name: string): void {
  if (!name.trim()) return
  const existing = loadRecentProjects()
  const next = [name, ...existing.filter((p) => p !== name)].slice(0, 10)
  try {
    localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(next))
  } catch {}
}

/**
 * Parse a hex color and apply it as the active accent across all CSS variables
 * that depend on it. Called synchronously at module load (App.tsx) and
 * whenever the user picks a new color so changes are instantaneous.
 */
export function applyAccentColor(hex: string): void {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return
  const s = document.documentElement.style
  // Drives Tailwind utilities: bg-amber, text-amber, border-amber/*, etc.
  s.setProperty('--color-amber', hex)
  // Drives bg-amber-soft (active filter buttons, etc.)
  s.setProperty('--color-amber-soft', `rgba(${r},${g},${b},0.16)`)
  // Drives the CSS rules updated in index.css
  s.setProperty('--accent-a40', `rgba(${r},${g},${b},0.4)`)
  s.setProperty('--accent-a45', `rgba(${r},${g},${b},0.45)`)
  s.setProperty('--accent-a70', `rgba(${r},${g},${b},0.7)`)
  s.setProperty('--accent-a08', `rgba(${r},${g},${b},0.08)`)
  s.setProperty('--accent-a03', `rgba(${r},${g},${b},0.03)`)
}
