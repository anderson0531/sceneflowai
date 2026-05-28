/**
 * Landing page sample project — collaboration demos (Blueprint, Storyboard, Screening Room).
 * Set share tokens/slugs when demo assets are ready; empty values show placeholders.
 *
 * Blueprint setup (one-time):
 * 1. Open the demo project in Studio → Blueprint phase
 * 2. Create an active Blueprint share link
 * 3. Copy token from /blueprint/share/{token} and set blueprintShareToken below
 *
 * Optional Screening Room footer link:
 * Create screening-room share via Vision/Premiere share link on the same project,
 * then set screeningRoomShareSlug to the slug from project metadata.
 */
export const LANDING_SAMPLE = {
  projectTitle: 'The White House Waltz: A Controlled Thaw',
  /** Public storyboard share slug, e.g. 'TheDawnOfSyntheticMinds'. Empty = placeholder UI. */
  storyboardShareSlug: 'TheWhiteHouseWaltzAControlledThaw',
  /** Blueprint collab share token from /blueprint/share/{token}. Empty = placeholder UI. */
  blueprintShareToken: '',
  /** Public screening-room share slug (same project). Empty = hide full Screening Room link. */
  screeningRoomShareSlug: '',
  /** Express animatic used in Screening Room landing demo */
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
  const slug = LANDING_SAMPLE.screeningRoomShareSlug.trim()
  if (!slug) return null
  return `/share/screening-room/${slug}`
}
