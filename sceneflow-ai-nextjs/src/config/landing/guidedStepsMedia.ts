/** Media URLs for guided pipeline steps (non-translatable). */

export type GuidedStepsMediaEntry = {
  imageUrl?: string
}

/** Step id -> screenshot (empty until marketing provides assets). */
export const GUIDED_STEPS_MEDIA: Record<string, GuidedStepsMediaEntry> = {
  start: {},
  blueprint: {},
  'draft-script': {},
  'audience-resonance': {},
  'reference-library': {},
  'express-audio': {},
  'beat-frames': {},
  'screening-room': {},
  'script-assistant': {},
  shoot: {},
  mixer: {},
  multilanguage: {},
  publish: {},
}

export function getGuidedStepMedia(stepId: string): GuidedStepsMediaEntry {
  return GUIDED_STEPS_MEDIA[stepId] ?? {}
}
