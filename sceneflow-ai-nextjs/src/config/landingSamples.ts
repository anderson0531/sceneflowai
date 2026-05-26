/**
 * Landing page sample project — one project, three outputs (storyboard, animatic, full video).
 * Set URLs/slug when demo assets are ready; empty values show placeholders.
 */
export const LANDING_SAMPLE = {
  projectTitle: 'The White House Waltz: A Controlled Thaw',
  /** Public storyboard share slug, e.g. 'TheDawnOfSyntheticMinds'. Empty = placeholder UI. */
  storyboardShareSlug: 'TheWhiteHouseWaltzAControlledThaw',
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
