export const LANDING_SECTION_COLLAPSE_COPY = {
  expandSection: 'Show section',
  collapseSection: 'Hide section',
} as const

/** Collapsible landing section ids (anchor targets). */
export const COLLAPSIBLE_LANDING_SECTION_IDS = [
  'use-cases',
  'pricing',
] as const

export type CollapsibleLandingSectionId = (typeof COLLAPSIBLE_LANDING_SECTION_IDS)[number]

/** Hash fragments that should expand a parent collapsible section. */
export const LANDING_HASH_TO_SECTION: Record<string, CollapsibleLandingSectionId> = {
  'use-cases': 'use-cases',
  pricing: 'pricing',
}
