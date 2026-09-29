/**
 * Background slots for the two value sections under friction.
 * No direction or publish walkthrough is in the repo or on Blob yet.
 * URLs stay empty so the sections show copy without a mismatched clip.
 */

import type { TwoModesMediaEntry } from '@/config/landing/twoModesMedia'

export const PRIMARY_VALUE_MEDIA_IDS = ['direction', 'publish'] as const

export type PrimaryValueMediaId = (typeof PRIMARY_VALUE_MEDIA_IDS)[number]

const EMPTY_MEDIA: TwoModesMediaEntry = {
  imageUrl: '',
  posterUrl: '',
  webmUrl: '',
  mp4Url: '',
}

export const PRIMARY_VALUE_MEDIA: Record<PrimaryValueMediaId, TwoModesMediaEntry> = {
  direction: { ...EMPTY_MEDIA },
  publish: { ...EMPTY_MEDIA },
}

export function getPrimaryValueMedia(id: string): TwoModesMediaEntry {
  if ((PRIMARY_VALUE_MEDIA_IDS as readonly string[]).includes(id)) {
    return PRIMARY_VALUE_MEDIA[id as PrimaryValueMediaId]
  }
  return EMPTY_MEDIA
}
