/**
 * User-facing Blueprint terminology — keep UI copy aligned with the Studio workflow.
 */

import { STUDIO_DISPLAY_NAMES } from '@/constants/studioDisplayNames'
import { ASSISTANT } from '@/lib/constants/assistant'

export interface GlossaryTerm {
  term: string
  definition: string
}

export const BLUEPRINT_GLOSSARY: Record<string, GlossaryTerm> = {
  blueprint: {
    term: 'Blueprint',
    definition: `Your structured film treatment — logline, beats, characters, and tone before ${STUDIO_DISPLAY_NAMES.production}.`,
  },
  production: {
    term: STUDIO_DISPLAY_NAMES.production,
    definition: `The script, storyboard, and video phase after your Blueprint is ready in ${STUDIO_DISPLAY_NAMES.blueprint}.`,
  },
  audienceResonance: {
    term: 'Audience Resonance',
    definition: 'AI score and recommendations for how well your Blueprint fits your target audience (80+ target).',
  },
  regenerateBlueprint: {
    term: 'Regenerate Blueprint',
    definition: `Full AI regen when you want a major creative reset — use the ${ASSISTANT.short} for scoped changes.`,
  },
  editBlueprint: {
    term: ASSISTANT.short,
    definition: `${ASSISTANT.full} — describe a change in plain words and it revises core info, story, tone, beats, or characters for you.`,
  },
  startProduction: {
    term: 'Open Production Studio',
    definition: `Hand off your Blueprint to generate script and begin the ${STUDIO_DISPLAY_NAMES.production} pipeline.`,
  },
}

export function blueprintGlossaryTooltip(key: keyof typeof BLUEPRINT_GLOSSARY): string {
  const entry = BLUEPRINT_GLOSSARY[key]
  return `${entry.term}: ${entry.definition}`
}

/** Legacy copy → canonical user-facing labels */
export const BLUEPRINT_COPY = {
  phaseTitle: STUDIO_DISPLAY_NAMES.blueprint,
  productionPhase: STUDIO_DISPLAY_NAMES.production,
  audienceResonance: 'Audience Resonance',
  scoreCard: 'Audience Resonance',
  startingProduction: `Opening ${STUDIO_DISPLAY_NAMES.production}…`,
  blueprintSavedOpeningProduction: `Blueprint saved — opening ${STUDIO_DISPLAY_NAMES.production}`,
  creatingVision: `Opening ${STUDIO_DISPLAY_NAMES.production}…`,
  reimagine: 'Regenerate Blueprint',
  editBlueprint: ASSISTANT.short,
  startProduction: 'Open Production Studio',
  /**
   * Header button label. Matches the next-step banner's Go button, while
   * `startProduction` stays the destination's name for the next-step text,
   * sidebar guide, tooltips and accessible names.
   */
  startProductionShort: 'Go',
  startProductionTooltip: `Open Production Studio — generate script and begin the ${STUDIO_DISPLAY_NAMES.production} pipeline`,
} as const
