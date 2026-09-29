/**
 * Media for the section under the hero.
 * The comparison slot is a public WebM background with an MP4 fallback.
 * Posters are WebP. WebM is listed before MP4 in the player.
 */

export const TWO_MODES_MEDIA_IDS = ['comparison'] as const

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
  comparison: {
    ...EMPTY_MEDIA,
    posterUrl: `${ILLUSTRATION_BASE}/comparison.webp`,
    webmUrl: `${ILLUSTRATION_BASE}/comparison.webm`,
    mp4Url: `${ILLUSTRATION_BASE}/comparison.mp4`,
  },
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
