import { useCallback, useEffect, useState } from 'react'
import type { Episode } from './quack'

/* ---------------------------------------------------------------------------
   Shared episode store. Persists user logged episodes to localStorage keyed by
   project, and lets any mounted panel subscribe so the Remember and Memory tabs
   stay in sync without prop drilling through App.
--------------------------------------------------------------------------- */

function key(project: string) {
  return `quack:episodes:${project || 'default'}`
}

function read(project: string): Episode[] {
  try {
    const raw = localStorage.getItem(key(project))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (e) =>
        e &&
        typeof e.title === 'string' &&
        typeof e.type === 'string' &&
        Array.isArray(e.files) &&
        Array.isArray(e.packages),
    )
  } catch {
    return []
  }
}

function write(project: string, episodes: Episode[]) {
  try {
    localStorage.setItem(key(project), JSON.stringify(episodes))
  } catch {
    // Storage unavailable. Persistence is best effort only.
  }
}

// Simple subscription registry so all hook instances refresh together.
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((fn) => fn())
}

/** Prepend a new episode for a project and notify subscribers. */
export function addEpisode(project: string, episode: Episode) {
  const next = [episode, ...read(project)]
  write(project, next)
  emit()
}

/**
 * Write seed episodes to the store only if the project has no stored episodes
 * yet. Safe to call on every mount -- it is a no-op after the first load.
 */
export function seedIfEmpty(project: string, seeds: Episode[]) {
  if (read(project).length === 0) {
    write(project, seeds)
    emit()
  }
}

/**
 * Replace the episode whose createdAt matches. The first match wins.
 * Notifies subscribers after writing.
 */
export function updateEpisode(
  project: string,
  createdAt: string,
  updated: Episode,
) {
  const episodes = read(project)
  const next = episodes.map((ep) =>
    ep.createdAt === createdAt ? updated : ep,
  )
  write(project, next)
  emit()
}

/**
 * Remove the episode whose createdAt matches. Notifies subscribers.
 */
export function deleteEpisode(project: string, createdAt: string) {
  const episodes = read(project)
  write(
    project,
    episodes.filter((ep) => ep.createdAt !== createdAt),
  )
  emit()
}

/**
 * Subscribe to a project's stored episodes, newest first. Reloads whenever the
 * project changes or another part of the app adds an episode.
 */
export function useStoredEpisodes(project: string): Episode[] {
  const [episodes, setEpisodes] = useState<Episode[]>(() => read(project))

  const refresh = useCallback(() => setEpisodes(read(project)), [project])

  // Reload when the project changes, adjusting state during render (React's
  // endorsed pattern) rather than in an effect.
  const [prevProject, setPrevProject] = useState(project)
  if (prevProject !== project) {
    setPrevProject(project)
    setEpisodes(read(project))
  }

  useEffect(() => {
    listeners.add(refresh)
    function onStorage(e: StorageEvent) {
      if (e.key === key(project)) refresh()
    }
    window.addEventListener('storage', onStorage)
    return () => {
      listeners.delete(refresh)
      window.removeEventListener('storage', onStorage)
    }
  }, [project, refresh])

  return episodes
}
