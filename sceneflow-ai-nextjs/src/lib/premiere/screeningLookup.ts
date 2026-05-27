import { list } from '@vercel/blob'
import type { PremiereScreeningRecord } from './screenings'

const LOOKUP_PREFIX = 'premiere/lookup/'

export interface PremiereScreeningLookup {
  screeningId: string
  projectId: string
  path: string
}

export async function writePremiereScreeningLookup(
  screeningId: string,
  projectId: string
): Promise<void> {
  const { put } = await import('@vercel/blob')
  const payload: PremiereScreeningLookup = {
    screeningId,
    projectId,
    path: `premiere/screenings/${projectId}/${screeningId}.json`,
  }
  await put(`${LOOKUP_PREFIX}${screeningId}.json`, JSON.stringify(payload), {
    access: 'public',
    addRandomSuffix: false,
    contentType: 'application/json; charset=utf-8',
  })
}

export async function findPremiereScreeningLookup(
  screeningId: string
): Promise<PremiereScreeningLookup | null> {
  const trimmed = screeningId.trim()
  if (!trimmed) return null

  try {
    const listing = await list({ prefix: `${LOOKUP_PREFIX}${trimmed}`, limit: 1 })
    const blob = listing.blobs[0]
    if (!blob?.url) return null
    const res = await fetch(blob.url, { cache: 'no-store' })
    if (!res.ok) return null
    const data = (await res.json()) as PremiereScreeningLookup
    if (data.screeningId !== trimmed || !data.projectId) return null
    return data
  } catch {
    return null
  }
}

export async function getPremiereScreeningById(
  screeningId: string
): Promise<PremiereScreeningRecord | null> {
  const lookup = await findPremiereScreeningLookup(screeningId)
  if (!lookup) return null

  try {
    const listing = await list({ prefix: lookup.path, limit: 1 })
    const blob = listing.blobs.find((b) => b.pathname === lookup.path) || listing.blobs[0]
    if (!blob?.url) return null
    const res = await fetch(blob.url, { cache: 'no-store' })
    if (!res.ok) return null
    return (await res.json()) as PremiereScreeningRecord
  } catch {
    return null
  }
}

export function premiereSharePath(screeningId: string): string {
  return `/s/${screeningId}`
}
