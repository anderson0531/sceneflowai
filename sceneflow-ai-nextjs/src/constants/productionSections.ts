/**
 * Production screen phase labels.
 *
 * The scene strip is eight tabs. Direction, Audio, Music, References, and
 * Stills optimize the script. Clips, Mixer, and Streams generate each shot.
 * The keys match the persisted `workflowCompletions` fields and must not be
 * renamed.
 */

import { ASSISTANT } from '@/lib/constants/assistant'

export type ProductionSectionKey = 'dialogueAction' | 'callAction'

export const PRODUCTION_SECTION_LABELS: Record<ProductionSectionKey, string> = {
  dialogueAction: 'Script',
  callAction: 'Clips',
}

export const PRODUCTION_SECTION_DESCRIPTIONS: Record<ProductionSectionKey, string> = {
  dialogueAction: `Optimize the script in Direction, Audio, Music, References, and Stills with the ${ASSISTANT.full} and Audience Resonance Analysis`,
  callAction: 'Generate the video for each shot in Clips, Mixer, and Streams',
}
