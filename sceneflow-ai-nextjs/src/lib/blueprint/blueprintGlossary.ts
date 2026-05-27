/**
 * User-facing Blueprint terminology — keep UI copy aligned with the Studio workflow.
 */

export interface GlossaryTerm {
  term: string
  definition: string
}

export const BLUEPRINT_GLOSSARY: Record<string, GlossaryTerm> = {
  blueprint: {
    term: 'Blueprint',
    definition: 'Your structured film treatment — logline, beats, characters, and tone before Production.',
  },
  production: {
    term: 'Production',
    definition: 'The script, storyboard, and video phase after your Blueprint is ready.',
  },
  audienceResonance: {
    term: 'Audience Resonance',
    definition: 'AI score and recommendations for how well your Blueprint fits your target audience (80+ target).',
  },
  regenerateBlueprint: {
    term: 'Regenerate Blueprint',
    definition: 'Full AI regen when you want a major creative reset — use Edit Blueprint for scoped changes.',
  },
  editBlueprint: {
    term: 'Edit Blueprint',
    definition: 'Scoped AI edits to core info, story, tone, beats, or characters.',
  },
  startProduction: {
    term: 'Start Production',
    definition: 'Hand off your Blueprint to generate script and begin the Production pipeline.',
  },
}

export function blueprintGlossaryTooltip(key: keyof typeof BLUEPRINT_GLOSSARY): string {
  const entry = BLUEPRINT_GLOSSARY[key]
  return `${entry.term}: ${entry.definition}`
}

/** Legacy copy → canonical user-facing labels */
export const BLUEPRINT_COPY = {
  phaseTitle: 'Blueprint',
  productionPhase: 'Production',
  audienceResonance: 'Audience Resonance',
  scoreCard: 'Audience Resonance',
  startingProduction: 'Starting Production…',
  blueprintSavedOpeningProduction: 'Blueprint saved — opening Production',
  creatingVision: 'Starting Production…',
  reimagine: 'Regenerate Blueprint',
  editBlueprint: 'Edit Blueprint',
  startProduction: 'Start Production',
  startProductionTooltip: 'Start Production — generate script and begin the Production pipeline',
} as const
