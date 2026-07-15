/**
 * Landing page sample project — interactive pre-vis demo on the Platform Walkthrough section.
 * Set storyboardShareSlug when demo assets are ready; empty value shows placeholder UI.
 *
 * Pre-vis setup (one-time):
 * 1. Open the demo project in Production and publish a public storyboard share link
 * 2. Copy the slug from /{slug} and set storyboardShareSlug below
 *
 * Optional legacy fields (blueprintShareToken, premiereScreeningId) remain for dashboard
 * setup or future landing sections — not used by the current landing pre-vis panel.
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
  /** Public storyboard share slug for YouTube Creator use-case embed on landing. Empty = mock placeholder. */
  youtubeCreatorScreeningSlug: 'TheUnseenArchiveTheGrandIllusionTheChicagoWorldsFairDeception',
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

export function getLandingYoutubeCreatorScreeningSlug(): string | null {
  const slug = LANDING_SAMPLE.youtubeCreatorScreeningSlug.trim()
  if (!slug) return null
  return slug
}

export function getLandingYoutubeCreatorScreeningHref(): string | null {
  const slug = getLandingYoutubeCreatorScreeningSlug()
  if (!slug) return null
  return `/${slug}`
}
