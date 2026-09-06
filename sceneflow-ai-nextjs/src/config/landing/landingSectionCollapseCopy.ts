export const LANDING_SECTION_COLLAPSE_COPY = {
  expandSection: 'Show section',
  collapseSection: 'Hide section',
} as const

/** Collapsible landing section ids (anchor targets). */
export const COLLAPSIBLE_LANDING_SECTION_IDS = [
  'pricing',
  'trust-safety',
] as const

export type CollapsibleLandingSectionId = (typeof COLLAPSIBLE_LANDING_SECTION_IDS)[number]

/**
 * Sections that start expanded. These carry the continuity and audience story,
 * so hiding them behind a toggle would bury the core pitch.
 */
export const DEFAULT_EXPANDED_LANDING_SECTION_IDS: readonly CollapsibleLandingSectionId[] = [
  'trust-safety',
]

/** Hash fragments that should expand a parent collapsible section. */
export const LANDING_HASH_TO_SECTION: Record<string, CollapsibleLandingSectionId> = {
  pricing: 'pricing',
  'trust-safety': 'trust-safety',
}
