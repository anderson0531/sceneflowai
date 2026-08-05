/**
 * Production screen section labels.
 *
 * The Production screen exposes two sections per scene: Writer's Room (script
 * optimization) and Motion (video generation). Labels match the marketing
 * vocabulary on the landing page; the keys match the persisted
 * `workflowCompletions` fields in project metadata and must not be renamed.
 */

import { ASSISTANT } from '@/lib/constants/assistant'

export type ProductionSectionKey = 'dialogueAction' | 'callAction'

export const PRODUCTION_SECTION_LABELS: Record<ProductionSectionKey, string> = {
  dialogueAction: "Writer's Room",
  callAction: 'Motion',
}

export const PRODUCTION_SECTION_DESCRIPTIONS: Record<ProductionSectionKey, string> = {
  dialogueAction: `Optimize your scene script with the ${ASSISTANT.full} and Audience Resonance Analysis`,
  callAction: 'Generate and edit the full-motion video for this scene',
}
