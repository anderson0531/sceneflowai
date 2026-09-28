/**
 * Empty media slots for the section under the hero.
 * Stills and posters are WebP. Walkthroughs are WebM, then an MP4 fallback.
 * URLs stay empty until a Blob file exists — do not commit binaries here.
 */

export const TWO_MODES_MEDIA_IDS = [
  'comparison',
  'series-desk',
  'blueprint-board',
  'production-stage',
  'screening-room',
] as const

export type TwoModesMediaId = (typeof TWO_MODES_MEDIA_IDS)[number]

export type TwoModesMediaEntry = {
  /** WebP still. Diagrams and screenshots use this field. */
  imageUrl: string
  /** WebP poster for a walkthrough. */
  posterUrl: string
  /** VP9 walkthrough. Listed before MP4 in the player. */
  webmUrl: string
  /** Safari fallback for the walkthrough. */
  mp4Url: string
}

const EMPTY_MEDIA: TwoModesMediaEntry = {
  imageUrl: '',
  posterUrl: '',
  webmUrl: '',
  mp4Url: '',
}

const ILLUSTRATION_BASE = '/landing/two-modes'

export const TWO_MODES_MEDIA: Record<TwoModesMediaId, TwoModesMediaEntry> = {
  comparison: { ...EMPTY_MEDIA, imageUrl: `${ILLUSTRATION_BASE}/comparison.webp` },
  'series-desk': { ...EMPTY_MEDIA },
  'blueprint-board': { ...EMPTY_MEDIA },
  'production-stage': { ...EMPTY_MEDIA },
  'screening-room': { ...EMPTY_MEDIA },
}

export function getTwoModesMedia(id: string): TwoModesMediaEntry {
  if ((TWO_MODES_MEDIA_IDS as readonly string[]).includes(id)) {
    return TWO_MODES_MEDIA[id as TwoModesMediaId]
  }
  return EMPTY_MEDIA
}

export function twoModesVideoSources(
  entry: TwoModesMediaEntry
): Array<{ src: string; type: 'video/webm' | 'video/mp4' }> {
  const sources: Array<{ src: string; type: 'video/webm' | 'video/mp4' }> = []
  if (entry.webmUrl) sources.push({ src: entry.webmUrl, type: 'video/webm' })
  if (entry.mp4Url) sources.push({ src: entry.mp4Url, type: 'video/mp4' })
  return sources
}

/** WebP still used when a slot has a picture and no walkthrough yet. */
export function twoModesStillSrc(entry: TwoModesMediaEntry): string {
  return entry.imageUrl
}
