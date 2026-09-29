/**
 * Background slots for the two value sections under friction.
 * Direction and publish play from public encodes (WebM first, MP4 fallback).
 */

import type { TwoModesMediaEntry } from '@/config/landing/twoModesMedia'

export const PRIMARY_VALUE_MEDIA_IDS = ['direction', 'publish'] as const

export type PrimaryValueMediaId = (typeof PRIMARY_VALUE_MEDIA_IDS)[number]

const ILLUSTRATION_BASE = '/landing/primary-value'

const EMPTY_MEDIA: TwoModesMediaEntry = {
  imageUrl: '',
  posterUrl: '',
  webmUrl: '',
  mp4Url: '',
}

export const PRIMARY_VALUE_MEDIA: Record<PrimaryValueMediaId, TwoModesMediaEntry> = {
  direction: {
    ...EMPTY_MEDIA,
    posterUrl: `${ILLUSTRATION_BASE}/direction.webp`,
    webmUrl: `${ILLUSTRATION_BASE}/direction.webm`,
    mp4Url: `${ILLUSTRATION_BASE}/direction.mp4`,
  },
  publish: {
    ...EMPTY_MEDIA,
    posterUrl: `${ILLUSTRATION_BASE}/publish.webp`,
    webmUrl: `${ILLUSTRATION_BASE}/publish.webm`,
    mp4Url: `${ILLUSTRATION_BASE}/publish.mp4`,
  },
}

export function getPrimaryValueMedia(id: string): TwoModesMediaEntry {
  if ((PRIMARY_VALUE_MEDIA_IDS as readonly string[]).includes(id)) {
    return PRIMARY_VALUE_MEDIA[id as PrimaryValueMediaId]
  }
  return EMPTY_MEDIA
}
