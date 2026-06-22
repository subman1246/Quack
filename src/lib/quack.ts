/* ---------------------------------------------------------------------------
   Quack data layer.

   recall, remember, and health talk to the live Parcle bridge over HTTP.
   listMemories stays local: it is backed by the seed cards plus whatever the
   Remember tab has written to localStorage through the shared episode store.
--------------------------------------------------------------------------- */

export type EpisodeType = 'decision' | 'bug' | 'dependency'

export interface Episode {
  type: EpisodeType
  title: string
  details: string
  files: string[]
  packages: string[]
  createdAt: string
}

export interface Citation {
  type: EpisodeType
  id: string
}

export interface RecallResult {
  answer: string
  confidence: number
  citations: Citation[]
}

export interface HealthResult {
  status: 'ok'
  project: string
  checkedAt: string
}

/**
 * Base URL for the Parcle bridge. Set VITE_BRIDGE_URL at build time to point at
 * a different deployment.
 */
const BASE: string =
  import.meta.env.VITE_BRIDGE_URL ?? 'https://subman1246-quack-bridge.hf.space'

/* --------------------- Local seed data for listMemories ----------------- */

/** Simulated network latency for the local listMemories path. */
const MOCK_DELAY = 600

function delay<T>(value: T, ms = MOCK_DELAY): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

function isoDaysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

const SEED_EPISODES: Episode[] = [
  {
    type: 'decision',
    title: 'Adopt cursor based pagination for the timeline API',
    details:
      'Switched the timeline endpoint from offset pagination to opaque cursors. Offsets drifted whenever new episodes landed mid scroll, which duplicated rows for users. Cursors encode the createdAt plus id so the feed stays stable under writes.',
    files: ['src/api/timeline.ts', 'src/api/pagination.ts'],
    packages: [],
    createdAt: isoDaysAgo(2),
  },
  {
    type: 'bug',
    title: 'Recall returned stale answers after a project switch',
    details:
      'When the user changed projects, the previous recall response was still cached and shown for a frame. Fixed by keying the recall cache on project plus query and clearing in flight requests on project change.',
    files: ['src/lib/quack.ts', 'src/components/RecallPanel.tsx'],
    packages: [],
    createdAt: isoDaysAgo(4),
  },
  {
    type: 'dependency',
    title: 'Pin lucide-react to avoid icon name churn',
    details:
      'A minor lucide-react release renamed several icons which broke the episode type glyphs at build time. Pinned the version and centralised icon imports so future bumps are a single review.',
    files: ['package.json', 'src/lib/episode-meta.ts'],
    packages: ['lucide-react'],
    createdAt: isoDaysAgo(6),
  },
  {
    type: 'decision',
    title: 'Use IBM Plex Mono for all identifiers and citations',
    details:
      'Mixed proportional and monospace text made ids and file paths hard to scan. Standardised every id, citation, and code token on IBM Plex Mono while keeping Inter for prose.',
    files: ['src/index.css', 'index.html'],
    packages: [],
    createdAt: isoDaysAgo(9),
  },
  {
    type: 'bug',
    title: 'Splash screen blocked keyboard focus on slow loads',
    details:
      'On slow connections the boot overlay trapped focus after the app mounted. Added a click and keypress skip plus an automatic dismiss so focus always reaches the recall input.',
    files: ['src/components/Splash.tsx'],
    packages: [],
    createdAt: isoDaysAgo(11),
  },
]

const localEpisodes: Episode[] = []

/* -------------------------------- Recall -------------------------------- */

/** Ask Quack a question about the project through the bridge. */
export async function recall(
  project: string,
  query: string,
): Promise<RecallResult> {
  try {
    const res = await fetch(`${BASE}/recall`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project, query }),
    })
    if (!res.ok) {
      throw new Error(`Recall request failed with status ${res.status}`)
    }
    const { answer, confidence, citations } = await res.json()
    return { answer, confidence, citations: citations ?? [] }
  } catch (err) {
    // Re-throw so the caller's existing toast handling can surface it.
    throw err instanceof Error ? err : new Error('Recall request failed')
  }
}

/* ------------------------------- Remember ------------------------------- */

/**
 * Persist a new episode through the bridge. The caller still writes the returned
 * episode into the local store, so the Memory tab updates on success.
 */
export async function remember(
  project: string,
  episode: Episode,
): Promise<Episode> {
  try {
    const res = await fetch(`${BASE}/remember`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project,
        type: episode.type,
        title: episode.title,
        details: episode.details,
        files: episode.files,
        packages: episode.packages,
      }),
    })
    if (!res.ok) {
      throw new Error(`Remember request failed with status ${res.status}`)
    }
    const saved = (await res.json()) as Partial<Episode>
    // Prefer the bridge's view of the episode, falling back to the submitted
    // fields so the returned value is always a complete Episode.
    return { ...episode, ...saved }
  } catch (err) {
    // Re-throw so the caller's existing error state can surface it.
    throw err instanceof Error ? err : new Error('Remember request failed')
  }
}

/* ------------------------------ List memory ----------------------------- */

/**
 * List all remembered episodes for a project, newest first. Stays local and
 * does not call the bridge.
 */
export async function listMemories(_project: string): Promise<Episode[]> {
  const all = [...localEpisodes, ...SEED_EPISODES]
  all.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
  return delay(all)
}

/* -------------------------------- Health -------------------------------- */

/**
 * Check the bridge health endpoint. Returns true when the response is ok and
 * false on any failure. Never throws.
 */
export async function health(_project = 'quack-demo'): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/health`)
    return res.ok
  } catch {
    return false
  }
}
