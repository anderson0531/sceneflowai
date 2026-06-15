export const LANDING_SECTION_COLLAPSE_COPY = {
  expandSection: 'Show section',
  collapseSection: 'Hide section',
} as const

/** Collapsible landing section ids (anchor targets). */
export const COLLAPSIBLE_LANDING_SECTION_IDS = [
  'creative-range',
  'tool-stack',
  'how-it-works',
  'why-sceneflow',
  'beat-first-pipeline',
  'extended-scenes',
  'trust-safety',
  'use-cases',
  'institutional-roi',
  'core-capabilities',
  'pre-vis-engine',
  'feature-pre-vis',
  'engineering',
  'pricing',
] as const

export type CollapsibleLandingSectionId = (typeof COLLAPSIBLE_LANDING_SECTION_IDS)[number]

/** Hash fragments that should expand a parent collapsible section. */
export const LANDING_HASH_TO_SECTION: Record<string, CollapsibleLandingSectionId> = {
  'creative-range': 'creative-range',
  'art-styles': 'creative-range',
  'output-formats': 'creative-range',
  'tool-stack': 'tool-stack',
  'how-it-works': 'how-it-works',
  'why-sceneflow': 'why-sceneflow',
  'beat-first-pipeline': 'beat-first-pipeline',
  'extended-scenes': 'extended-scenes',
  'trust-safety': 'trust-safety',
  'use-cases': 'use-cases',
  'production-verticals': 'use-cases',
  'institutional-roi': 'institutional-roi',
  'core-capabilities': 'core-capabilities',
  'pre-vis-engine': 'pre-vis-engine',
  'feature-pre-vis': 'feature-pre-vis',
  'feature-storyboard': 'feature-pre-vis',
  engineering: 'engineering',
  pricing: 'pricing',
}
