'use client'

import { useEffect, useState } from 'react'
import type { UserDisplayNameInput } from '@/lib/user/displayName'

export type CreatorProfile = UserDisplayNameInput

export type CreatorProfileState = {
  profile: CreatorProfile | null
  /** True until the first fetch settles, so callers can avoid a wrong empty state. */
  loading: boolean
}

/**
 * The signed-in user's profile, read from the database.
 *
 * `session.user` cannot be trusted for names: the NextAuth JWT is only written at
 * sign-in, so a profile edit is invisible to it until the user re-authenticates.
 * Anything that displays a person's name needs the authoritative row.
 */

let cached: CreatorProfile | null = null
let inFlight: Promise<CreatorProfile | null> | null = null

async function fetchProfile(): Promise<CreatorProfile | null> {
  try {
    const res = await fetch('/api/user/profile', { credentials: 'include' })
    if (!res.ok) return null
    const data = await res.json()
    const user = data?.user
    if (!user) return null
    return {
      first_name: user.first_name ?? null,
      last_name: user.last_name ?? null,
      username: user.username ?? null,
      email: user.email ?? null,
    }
  } catch {
    return null
  }
}

/** Shared across consumers so mounting this on several surfaces is one request. */
export function loadCreatorProfile(): Promise<CreatorProfile | null> {
  if (cached) return Promise.resolve(cached)
  if (!inFlight) {
    inFlight = fetchProfile().then((profile) => {
      cached = profile
      inFlight = null
      return profile
    })
  }
  return inFlight
}

/** Drop the cache after a profile edit so the next read reflects it. */
export function invalidateCreatorProfile(): void {
  cached = null
  inFlight = null
}

export function useCreatorProfile(): CreatorProfileState {
  const [profile, setProfile] = useState<CreatorProfile | null>(cached)
  const [loading, setLoading] = useState(!cached)

  useEffect(() => {
    if (cached) {
      setProfile(cached)
      setLoading(false)
      return
    }

    let active = true
    setLoading(true)
    void loadCreatorProfile().then((next) => {
      if (!active) return
      setProfile(next)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [])

  return { profile, loading }
}
