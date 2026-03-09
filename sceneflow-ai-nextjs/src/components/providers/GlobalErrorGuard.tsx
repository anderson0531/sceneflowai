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
export function GlobalErrorGuard() {
  useEffect(() => {
    const handler = (event: PromiseRejectionEvent) => {
      const error = event.reason

      // Only suppress known transient/network errors
      const isTransient =
        // AbortError from navigating away while fetch is in-flight
        error?.name === 'AbortError' ||
        // Workbox service worker CustomFetchError when NetworkFirst times out
        error?.name === 'CustomFetchError' ||
        // Generic fetch failures (offline, DNS, etc.)
        (error?.message && (
          error.message.includes('Failed to fetch') ||
          error.message.includes('Load failed') ||
          error.message.includes('NetworkError') ||
          error.message.includes('The operation was aborted') ||
          error.message.includes('network request failed') ||
          error.message.includes('Unexpected Error')
        ))

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
