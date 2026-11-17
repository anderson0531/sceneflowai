'use client'

import { useEffect } from 'react'

/**
 * Global handler for unhandled promise rejections.
 * 
 * Catches transient network errors (AbortError, CustomFetchError from Workbox service worker,
 * Failed to fetch) that would otherwise crash the Next.js app with:
 * "Application error: a client-side exception has occurred"
 * 
 * These errors are typically caused by:
 * - Service worker killing requests that exceed its networkTimeoutSeconds
 * - Navigation aborting in-flight fetch requests
 * - Intermittent network connectivity issues
 * 
 * Real application errors are NOT suppressed — they propagate to React error boundaries.
 */
const CHUNK_RELOAD_GUARD_KEY = 'sf-chunk-reload-ts'
const CHUNK_RELOAD_COOLDOWN_MS = 15_000

export function isStaleChunkOrModuleError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const name = 'name' in error ? String((error as { name?: unknown }).name ?? '') : ''
  const msg = 'message' in error ? String((error as { message?: unknown }).message ?? '') : ''
  return (
    name === 'ChunkLoadError' ||
    msg.includes('ChunkLoadError') ||
    msg.includes('Loading chunk') ||
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('error loading dynamically imported module')
  )
}

export function attemptOneTimeChunkRecoveryReload(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const prev = Number(window.sessionStorage.getItem(CHUNK_RELOAD_GUARD_KEY) ?? '0')
    const now = Date.now()
    if (Number.isFinite(prev) && prev > 0 && now - prev < CHUNK_RELOAD_COOLDOWN_MS) {
      return false
    }
    window.sessionStorage.setItem(CHUNK_RELOAD_GUARD_KEY, String(now))
    window.location.reload()
    return true
  } catch {
    return false
  }
}

export function GlobalErrorGuard() {
  useEffect(() => {
    const handler = (event: PromiseRejectionEvent) => {
      const error = event.reason

      // Auto-recover once when a Vercel deployment rollover invalidates lazy-loaded Next.js chunks
      if (isStaleChunkOrModuleError(error)) {
        event.preventDefault()
        attemptOneTimeChunkRecoveryReload()
        return
      }

      // Only suppress known transient/network/service-worker errors
      const isTransient =
        // AbortError from navigating away while fetch is in-flight
        error?.name === 'AbortError' ||
        // Workbox/Serwist service worker transient errors
        error?.name === 'CustomFetchError' ||
        error?.name === 'WorkboxError' ||
        error?.message === 'no-response' ||
        // Generic fetch failures (offline, DNS, SW precache rollover, etc.)
        (typeof error?.message === 'string' &&
          (error.message.includes('Failed to fetch') ||
            error.message.includes('Load failed') ||
            error.message.includes('NetworkError') ||
            error.message.includes('The operation was aborted') ||
            error.message.includes('network request failed') ||
            error.message.includes('no-response') ||
            error.message.includes('bad-precaching-response') ||
            error.message.includes('Unexpected Error')))

      if (isTransient) {
        // Prevent this from crashing the app
        event.preventDefault()
        console.warn('[GlobalErrorGuard] Suppressed transient error:', error?.name, error?.message)
      }
      // All other errors propagate normally to error boundaries
    }

    window.addEventListener('unhandledrejection', handler)
    return () => window.removeEventListener('unhandledrejection', handler)
  }, [])

  return null
}
