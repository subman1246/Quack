/* ---------------------------------------------------------------------------
   Bridge URL resolution. Imported by quack.ts (for fetch calls) and
   settings-store.ts (for the UI prefill). Kept in its own file so neither
   quack nor settings-store creates a circular dependency.
--------------------------------------------------------------------------- */

export const BRIDGE_FALLBACK_URL: string =
  import.meta.env.VITE_BRIDGE_URL ?? 'https://subman1246-quack-bridge.hf.space'

/**
 * Resolve the active bridge base URL in priority order:
 *   1. localStorage override (set via Settings > Connection)
 *   2. VITE_BRIDGE_URL env variable
 *   3. Hardcoded default
 * Called per request so a saved override is picked up without a page reload.
 */
export function getBridgeBase(): string {
  try {
    const raw = localStorage.getItem('quack:settings')
    if (raw) {
      const { bridgeUrlOverride } = JSON.parse(raw) as {
        bridgeUrlOverride?: string
      }
      if (typeof bridgeUrlOverride === 'string' && bridgeUrlOverride.trim()) {
        return bridgeUrlOverride.trim().replace(/\/$/, '')
      }
    }
  } catch {}
  return BRIDGE_FALLBACK_URL
}
