/**
 * Vertex AI Context Cache Store
 * 
 * Client-side Zustand store for tracking active CachedContent references.
 * Survives across API calls within a browser session so follow-up edits
 * can reference the same cache_id without re-creating the cache.
 * 
 * NOT persisted to localStorage — caches are scoped to the editing session.
 * When the user closes the tab, TTL handles automatic cleanup on Vertex AI.
 * 
 * @see src/lib/vertexai/cacheManager.ts for server-side cache lifecycle
 */

import { create } from 'zustand'

// =============================================================================
// Types (mirrors server-side CacheEntry, but only the fields the client needs)
// =============================================================================

export type CacheZone = 
  | 'script_doctor'
  | 'style_consistency'
  | 'multilingual_dubbing'
  | 'scene_direction'
  | 'cue_assistant'

export interface CacheReference {
  /** Short ID (e.g., "abc123") */
  cacheId: string
  /** Full Vertex AI resource name for API calls */
  resourceName: string
  /** Which zone this cache belongs to */
  zone: CacheZone
  /** SHA-256 of the cached content (for staleness detection) */
  contentHash: string
  /** ISO 8601 expiry time */
  expiresAt: string
  /** Model the cache was created for */
  model: string
}

// =============================================================================
// Store Interface
// =============================================================================

interface CacheState {
  /** Active caches keyed by `${projectId}:${zone}` */
  caches: Record<string, CacheReference>

  // ── Actions ──

  /** Store a cache reference returned from the API */
  setCacheRef: (projectId: string, ref: CacheReference) => void

  /** Retrieve a valid (non-expired) cache reference */
  getCacheRef: (projectId: string, zone: CacheZone) => CacheReference | null

  /** Remove a specific cache reference */
  removeCacheRef: (projectId: string, zone: CacheZone) => void

  /** Clear all caches for a project (session end) */
  clearProject: (projectId: string) => void

  /** Clear all caches (full reset) */
  clearAll: () => void

  /** Update the expiresAt for a cache (after heartbeat response) */
  updateExpiry: (projectId: string, zone: CacheZone, newExpiresAt: string) => void
}

// =============================================================================
// Store Implementation
// =============================================================================

export const useCacheStore = create<CacheState>((set, get) => ({
  caches: {},

  setCacheRef: (projectId, ref) =>
    set((state) => ({
      caches: {
        ...state.caches,
        [`${projectId}:${ref.zone}`]: ref,
      },
    })),

  getCacheRef: (projectId, zone) => {
    const entry = get().caches[`${projectId}:${zone}`]
    if (!entry) return null

    // Client-side expiry check
    if (new Date(entry.expiresAt) < new Date()) {
      // Expired — clean up
      get().removeCacheRef(projectId, zone)
      return null
    }

    return entry
  },

  removeCacheRef: (projectId, zone) =>
    set((state) => {
      const key = `${projectId}:${zone}`
      const { [key]: _, ...rest } = state.caches
      return { caches: rest }
    }),

  clearProject: (projectId) =>
    set((state) => {
      const remaining = Object.fromEntries(
        Object.entries(state.caches).filter(
          ([key]) => !key.startsWith(`${projectId}:`)
        )
      )
      return { caches: remaining }
    }),

  clearAll: () => set({ caches: {} }),

  updateExpiry: (projectId, zone, newExpiresAt) =>
    set((state) => {
      const key = `${projectId}:${zone}`
      const entry = state.caches[key]
      if (!entry) return state
      return {
        caches: {
          ...state.caches,
          [key]: { ...entry, expiresAt: newExpiresAt },
        },
      }
    }),
}))
