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

  // Series pillar (How It Works timeline)
  'series-concept': stepMedia('series-concept'),
  'series-baseline': stepMedia('series-baseline'),
  'series-episodes': stepMedia('series-episodes'),
  'series-reference-library': stepMedia('series-reference-library'),
  'series-assistant-writer': stepMedia('series-assistant-writer'),
  'series-start-production': stepMedia('series-start-production'),

  // Blueprint pillar (How It Works timeline)
  'blueprint-baseline': stepMedia('blueprint-baseline'),
  'blueprint-assistant-writer': stepMedia('blueprint-assistant-writer'),
  'blueprint-reasoning': stepMedia('blueprint-reasoning'),
  'blueprint-start-production': stepMedia('blueprint-start-production'),

  // Production pillar (How It Works timeline)
  'production-script-ara': stepMedia('production-script-ara'),
  'production-assistant-writer': stepMedia('production-assistant-writer'),
  'production-reference-library': stepMedia('production-reference-library'),
  'production-audio': stepMedia('production-audio'),
  'production-frames': stepMedia('production-frames'),
  'production-animatic': stepMedia('production-animatic'),
  'production-video': stepMedia('production-video'),
  'production-mixer': stepMedia('production-mixer'),
  'production-render-scenes': stepMedia('production-render-scenes'),
  'production-multilanguage': stepMedia('production-multilanguage'),
  'production-publish': stepMedia('production-publish'),
}

export function getGuidedStepMedia(stepId: string): GuidedStepsMediaEntry {
  return GUIDED_STEPS_MEDIA[stepId] ?? {}
}
