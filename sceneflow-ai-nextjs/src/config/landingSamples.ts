/**
 * Landing page sample project — collaboration demos (Blueprint, Storyboard, Screening Room).
 * Set share tokens/slugs when demo assets are ready; empty values show placeholders.
 *
 * Blueprint setup (one-time):
 * 1. Open the demo project in Studio → Blueprint phase
 * 2. Create an active Blueprint share link
 * 3. Copy token from /blueprint/share/{token} and set blueprintShareToken below
 *
 * Premiere Screening Room setup (one-time):
 * 1. Open the demo project in Premiere → publish a public Express animatic screening
 *    (use animaticVideoUrl below as the video source when creating the screening)
 * 2. Copy the premiere-* id from the share URL (/s/premiere-...) and set premiereScreeningId
 *
 * Note: screeningRoomShareSlug is the legacy Vision scene player (/share/screening-room/...).
 * The landing Screening tab uses Premiere AudiencePlayer via premiereScreeningId.
 */
export const LANDING_SAMPLE = {
  projectTitle: 'The White House Waltz: A Controlled Thaw',
  /** Public storyboard share slug, e.g. 'TheDawnOfSyntheticMinds'. Empty = placeholder UI. */
  storyboardShareSlug: 'TheWhiteHouseWaltzAControlledThaw',
  /** Blueprint collab share token from /blueprint/share/{token}. Empty = placeholder UI. */
  blueprintShareToken: '50IuESZwELvHkNd4bTaULp1pli56zXWg',
  /** Legacy Vision screening-room slug (/share/screening-room/...). Not used on landing tab. */
  screeningRoomShareSlug: '',
  /** Premiere public screening id from /s/premiere-... Empty = Screening tab placeholder. */
  premiereScreeningId: '',
  /** Reference URL when creating the Premiere animatic screening in dashboard */
  animaticVideoUrl:
    'https://xxavfkdhdebrqida.public.blob.vercel-storage.com/Whitehouse%20Waltz.mp4',
  fullVideoUrl: '',
} as const

/** Languages showcased on the landing demo storyboard (audio pruned via scripts/prune-demo-languages.mjs). */
export const LANDING_SAMPLE_DEMO_LANGUAGES = ['en', 'th', 'es', 'ar', 'hi', 'ja', 'zh'] as const

/** Backfill missing hi/ar/es dialogue via: npx tsx scripts/fill-demo-dialogue-audio.mjs TheWhiteHouseWaltzAControlledThaw */

export function getLandingSampleShareHref(): string | null {
  const slug = LANDING_SAMPLE.storyboardShareSlug.trim()
  if (!slug) return null
  return `/${slug}`
}

export function getLandingBlueprintShareHref(): string | null {
  const token = LANDING_SAMPLE.blueprintShareToken.trim()
  if (!token) return null
  return `/blueprint/share/${token}`
}

export function getLandingScreeningShareHref(): string | null {
  const id = LANDING_SAMPLE.premiereScreeningId.trim()
  if (!id) return null
  return `/s/${id}`
}

export function getLandingPremiereScreeningEmbedHref(): string | null {
  const id = LANDING_SAMPLE.premiereScreeningId.trim()
  if (!id) return null
  return `/embed/screening/${encodeURIComponent(id)}`
}
