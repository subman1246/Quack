/* ---------------------------------------------------------------------------
   Quack mock data layer.

   These functions stand in for the real Quack bridge. They return realistic
   shaped data after a short delay so the UI can be built end to end with no
   backend. Each function is marked with a TODO to swap in the real transport.
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

/** Simulated network latency for the mock layer. */
const MOCK_DELAY = 600

function delay<T>(value: T, ms = MOCK_DELAY): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

function isoDaysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

/* ----------------------------- Seed memories ---------------------------- */

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

/* -------------------------------- Recall -------------------------------- */

function pickCitations(query: string): Citation[] {
  // Choose 1 to 3 seed episodes that loosely relate to the query.
  const q = query.toLowerCase()
  const scored = SEED_EPISODES.map((ep, i) => {
    const hay = (ep.title + ' ' + ep.details).toLowerCase()
    const words = q.split(/\s+/).filter(Boolean)
    const score = words.reduce((acc, w) => acc + (hay.includes(w) ? 1 : 0), 0)
    return { ep, i, score }
  })
  scored.sort((a, b) => b.score - a.score || a.i - b.i)
  const count = Math.min(3, Math.max(1, scored[0].score > 0 ? 2 : 1))
  return scored.slice(0, count).map(({ ep, i }) => ({
    type: ep.type,
    id: `ep_${String(i + 1).padStart(4, '0')}`,
  }))
}

/**
 * Ask Quack a question about the project.
 * TODO: replace with the real Quack bridge call.
 */
export async function recall(
  project: string,
  query: string,
): Promise<RecallResult> {
  const citations = pickCitations(query)
  const answer =
    `Based on what ${project} remembers, ` +
    `the relevant history points to ${citations.length} episode` +
    `${citations.length === 1 ? '' : 's'}. ` +
    `The most recent decision was to keep the timeline feed stable under ` +
    `concurrent writes, and a related bug around stale recall responses was ` +
    `resolved by keying the cache on project and query. Review the cited ` +
    `episodes for the exact files and rationale.`

  const confidence = Math.min(
    0.97,
    0.55 + citations.length * 0.12 + (query.trim().length > 12 ? 0.08 : 0),
  )

  return delay({ answer, confidence, citations })
}

/* ------------------------------- Remember ------------------------------- */

const localEpisodes: Episode[] = []

/**
 * Persist a new episode into the project memory.
 * TODO: replace with the real Quack bridge call.
 */
export async function remember(
  _project: string,
  episode: Episode,
): Promise<Episode> {
  const saved: Episode = {
    ...episode,
    createdAt: episode.createdAt || new Date().toISOString(),
  }
  localEpisodes.unshift(saved)
  return delay(saved)
}

/* ------------------------------ List memory ----------------------------- */

/**
 * List all remembered episodes for a project, newest first.
 * TODO: replace with the real Quack bridge call.
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
 * Check the Quack connection for a project.
 * TODO: replace with the real Quack bridge call.
 */
export async function health(project = 'quack-demo'): Promise<HealthResult> {
  return delay({
    status: 'ok',
    project,
    checkedAt: new Date().toISOString(),
  })
}
