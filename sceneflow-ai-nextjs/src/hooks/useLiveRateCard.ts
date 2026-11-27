'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  getSeededRateCardSnapshot,
  type LiveRateCardSnapshot,
  type RateCardMap,
} from '@/lib/credits/quoteGenerationCredits'

const CACHE_TTL_MS = 60_000

let cachedSnapshot: LiveRateCardSnapshot | null = null
let cachedAt = 0
let inFlightFetch: Promise<LiveRateCardSnapshot> | null = null
const listeners = new Set<(snap: LiveRateCardSnapshot) => void>()

function notifyAll(snap: LiveRateCardSnapshot): void {
  listeners.forEach((fn) => {
    try {
      fn(snap)
    } catch {
      // ignore subscriber errors
    }
  })
}

async function fetchLiveRateCard(force = false): Promise<LiveRateCardSnapshot> {
  const now = Date.now()
  if (!force && cachedSnapshot && now - cachedAt < CACHE_TTL_MS) {
    return cachedSnapshot
  }
  if (!force && inFlightFetch) {
    return inFlightFetch
  }

  inFlightFetch = (async () => {
    try {
      const res = await fetch('/api/credits/rate-card', {
        cache: force ? 'no-store' : 'default',
      })
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      const data = (await res.json()) as LiveRateCardSnapshot
      if (data && data.rates && typeof data.rates === 'object') {
        cachedSnapshot = data
        cachedAt = Date.now()
        notifyAll(data)
        return data
      }
    } catch {
      // Keep seeded or previously cached snapshot on offline/network error
    }
    return cachedSnapshot ?? getSeededRateCardSnapshot()
  })().finally(() => {
    inFlightFetch = null
  })

  return inFlightFetch
}

/**
 * Shared React hook fetching live published rates from `GET /api/credits/rate-card`.
 *
 * - Initializes synchronously from `getSeededRateCardSnapshot()` (zero layout shift).
 * - Deduplicates concurrent fetches across all mounted calculators/dialogs on the page.
 * - Caches for 60s and updates all mounted subscribers immediately when fetched or refreshed.
 */
export function useLiveRateCard(): {
  snapshot: LiveRateCardSnapshot
  rateCard: RateCardMap
  isLive: boolean
  isLoading: boolean
  refresh: () => Promise<LiveRateCardSnapshot>
} {
  const [snapshot, setSnapshot] = useState<LiveRateCardSnapshot>(
    () => cachedSnapshot ?? getSeededRateCardSnapshot()
  )
  const [isLoading, setIsLoading] = useState<boolean>(
    () => !cachedSnapshot || Date.now() - cachedAt >= CACHE_TTL_MS
  )

  useEffect(() => {
    listeners.add(setSnapshot)
    let active = true

    if (!cachedSnapshot || Date.now() - cachedAt >= CACHE_TTL_MS) {
      setIsLoading(true)
      void fetchLiveRateCard(false).then((snap) => {
        if (!active) return
        setSnapshot(snap)
        setIsLoading(false)
      })
    } else {
      setSnapshot(cachedSnapshot)
      setIsLoading(false)
    }

    return () => {
      active = false
      listeners.delete(setSnapshot)
    }
  }, [])

  const refresh = useCallback(async () => {
    setIsLoading(true)
    try {
      const snap = await fetchLiveRateCard(true)
      setSnapshot(snap)
      return snap
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    snapshot,
    rateCard: snapshot.rates,
    isLive: snapshot.isLive,
    isLoading,
    refresh,
  }
}

export function resetLiveRateCardCache(): void {
  cachedSnapshot = null
  cachedAt = 0
  inFlightFetch = null
}
