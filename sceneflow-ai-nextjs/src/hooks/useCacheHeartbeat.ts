/**
 * Cache Heartbeat Hook
 * 
 * Periodically extends the TTL of active Vertex AI context caches
 * while the user is actively working in the editor. Also handles
 * cleanup on session end (browser close / navigation away).
 * 
 * Usage:
 *   const { activeCacheCount } = useCacheHeartbeat(projectId)
 * 
 * Heartbeat interval: every 15 minutes (well before the 60-min TTL expires).
 * Cleanup: sends a best-effort /api/cache/cleanup on beforeunload.
 */

'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useCacheStore, type CacheZone } from '@/store/useCacheStore'

/** Heartbeat interval: 15 minutes */
const HEARTBEAT_INTERVAL_MS = 15 * 60 * 1000

interface UseCacheHeartbeatOptions {
  /** Whether heartbeat is enabled (default: true) */
  enabled?: boolean
  /** Heartbeat interval in ms (default: 15 minutes) */
  intervalMs?: number
}

interface UseCacheHeartbeatResult {
  /** Number of active caches for this project */
  activeCacheCount: number
  /** Manually trigger a heartbeat for all caches */
  sendHeartbeat: () => Promise<void>
  /** Manually invalidate a specific zone's cache */
  invalidateZone: (zone: CacheZone) => Promise<void>
}

export function useCacheHeartbeat(
  projectId: string | undefined,
  options: UseCacheHeartbeatOptions = {}
): UseCacheHeartbeatResult {
  const { enabled = true, intervalMs = HEARTBEAT_INTERVAL_MS } = options
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  
  const caches = useCacheStore((state) => state.caches)
  const clearProject = useCacheStore((state) => state.clearProject)
  const updateExpiry = useCacheStore((state) => state.updateExpiry)
  const removeCacheRef = useCacheStore((state) => state.removeCacheRef)

  // Count active caches for this project
  const activeCacheCount = projectId
    ? Object.keys(caches).filter((key) => key.startsWith(`${projectId}:`)).length
    : 0

  // Send heartbeat for all active caches
  const sendHeartbeat = useCallback(async () => {
    if (!projectId) return

    const projectCaches = Object.entries(caches).filter(([key]) =>
      key.startsWith(`${projectId}:`)
    )

    if (projectCaches.length === 0) return

    console.log(`[CacheHeartbeat] Sending heartbeat for ${projectCaches.length} cache(s)`)

    for (const [, cacheRef] of projectCaches) {
      try {
        const response = await fetch('/api/cache/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            resourceName: cacheRef.resourceName,
          }),
        })

        if (response.ok) {
          const data = await response.json()
          if (data.newExpiresAt) {
            updateExpiry(projectId, cacheRef.zone, data.newExpiresAt)
          }
        } else if (response.status === 404) {
          // Cache no longer exists on Vertex AI
          console.warn(`[CacheHeartbeat] Cache ${cacheRef.cacheId} expired, removing`)
          removeCacheRef(projectId, cacheRef.zone)
        }
      } catch (error) {
        console.warn(`[CacheHeartbeat] Failed for ${cacheRef.zone}:`, error)
      }
    }
  }, [projectId, caches, updateExpiry, removeCacheRef])

  // Invalidate a specific zone
  const invalidateZone = useCallback(
    async (zone: CacheZone) => {
      if (!projectId) return

      const cacheRef = useCacheStore.getState().getCacheRef(projectId, zone)
      if (!cacheRef) return

      try {
        await fetch('/api/cache/invalidate', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            resourceName: cacheRef.resourceName,
          }),
        })
      } catch (error) {
        console.warn(`[CacheHeartbeat] Invalidate failed for ${zone}:`, error)
      }

      removeCacheRef(projectId, zone)
    },
    [projectId, removeCacheRef]
  )

  // Set up periodic heartbeat
  useEffect(() => {
    if (!enabled || !projectId || activeCacheCount === 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    // Send immediately on mount (if caches exist)
    sendHeartbeat()

    // Then every intervalMs
    intervalRef.current = setInterval(sendHeartbeat, intervalMs)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [enabled, projectId, activeCacheCount, intervalMs, sendHeartbeat])

  // Cleanup on beforeunload — best-effort, fire-and-forget
  useEffect(() => {
    if (!projectId) return

    const handleUnload = () => {
      // Use sendBeacon for reliability during page unload
      const cacheKeys = Object.keys(caches).filter((key) =>
        key.startsWith(`${projectId}:`)
      )

      if (cacheKeys.length > 0) {
        // Best-effort cleanup — TTL handles it if this fails
        try {
          navigator.sendBeacon(
            '/api/cache/cleanup',
            JSON.stringify({ projectId })
          )
        } catch {
          // Silent fail — TTL is the safety net
        }
      }

      // Clear local state
      clearProject(projectId)
    }

    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
  }, [projectId, caches, clearProject])

  return {
    activeCacheCount,
    sendHeartbeat,
    invalidateZone,
  }
}
