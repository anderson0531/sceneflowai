/**
 * Media URLs for guided pipeline steps (non-translatable).
 *
 * Drop finished assets under `public/landing/how-it-works/`:
 *   - `{stepId}.mp4` — 30-second narrated walkthrough
 *   - `{stepId}.jpg` — poster frame (first frame or branded still)
 *
 * Uncomment or set `videoUrl` / `posterUrl` when each MP4 is ready.
 */

export type GuidedStepsMediaEntry = {
  imageUrl?: string
  videoUrl?: string
  posterUrl?: string
}

const HOW_IT_WORKS_BASE = '/landing/how-it-works'

function stepMedia(stepId: string): GuidedStepsMediaEntry {
  return {
    // videoUrl: `${HOW_IT_WORKS_BASE}/${stepId}.mp4`,
    // posterUrl: `${HOW_IT_WORKS_BASE}/${stepId}.jpg`,
  }
}

/** Step id -> screenshot / video (empty until marketing provides assets). */
export const GUIDED_STEPS_MEDIA: Record<string, GuidedStepsMediaEntry> = {
  start: {
    videoUrl: `${HOW_IT_WORKS_BASE}/start.mp4`,
    posterUrl: `${HOW_IT_WORKS_BASE}/start.png`,
  },
  blueprint: stepMedia('blueprint'),
  'draft-script': stepMedia('draft-script'),
  'audience-resonance': stepMedia('audience-resonance'),
  'set-production-budget': stepMedia('set-production-budget'),
  'reference-library': stepMedia('reference-library'),
  'express-audio': stepMedia('express-audio'),
  'beat-frames': stepMedia('beat-frames'),
  'screening-room': stepMedia('screening-room'),
  'script-assistant': stepMedia('script-assistant'),
  shoot: stepMedia('shoot'),
  mixer: stepMedia('mixer'),
  multilanguage: stepMedia('multilanguage'),
  publish: stepMedia('publish'),
}

export function getGuidedStepMedia(stepId: string): GuidedStepsMediaEntry {
  return GUIDED_STEPS_MEDIA[stepId] ?? {}
}
