/**
 * Landing page sample project — one project, three outputs (storyboard, animatic, full video).
 * Set URLs/slug when demo assets are ready; empty values show placeholders.
 */
export const LANDING_SAMPLE = {
  projectTitle: 'Sample Project',
  /** Public storyboard share slug, e.g. 'TheDawnOfSyntheticMinds'. Empty = placeholder UI. */
  storyboardShareSlug: '',
  animaticVideoUrl: '',
  fullVideoUrl: '',
} as const

export function getLandingSampleShareHref(): string | null {
  const slug = LANDING_SAMPLE.storyboardShareSlug.trim()
  if (!slug) return null
  return `/${slug}`
}
