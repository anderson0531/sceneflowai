export const LANDING_SECTION_COLLAPSE_COPY = {
  expandSection: 'Show section',
  collapseSection: 'Hide section',
} as const

/** Collapsible landing section ids (anchor targets). */
export const COLLAPSIBLE_LANDING_SECTION_IDS = [
  'key-features',
  'pricing',
  'trust-safety',
] as const

export type CollapsibleLandingSectionId = (typeof COLLAPSIBLE_LANDING_SECTION_IDS)[number]

/**
 * Sections that start expanded.
 * `key-features` (the 30-item full reference directory) starts collapsed beneath
 * the 4-Stage Guided Studio Tour so visitors aren't hit by a software manual upfront,
 * while auto-expanding whenever `#key-features` or any room hash is visited.
 */
export const DEFAULT_EXPANDED_LANDING_SECTION_IDS: readonly CollapsibleLandingSectionId[] = [
  'pricing',
  'trust-safety',
]

/** Hash fragments that should expand a parent collapsible section. */
export const LANDING_HASH_TO_SECTION: Record<string, CollapsibleLandingSectionId> = {
  'key-features': 'key-features',
  'series-desk': 'key-features',
  'blueprint-board': 'key-features',
  'production-stage': 'key-features',
  'screening-room': 'key-features',
  pricing: 'pricing',
  'trust-safety': 'trust-safety',
}
