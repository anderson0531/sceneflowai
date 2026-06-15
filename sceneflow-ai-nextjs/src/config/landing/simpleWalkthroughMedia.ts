/** Media URLs for simplified walkthrough steps (non-translatable). */

import { FEATURE_STORYBOARD_MEDIA } from '@/config/landing/featureStoryboardMedia'
import { SCREENING_ROOM_COPY } from '@/config/landing/workflowPhaseCopy'

const BLOB = 'https://xxavfkdhdebrqida.public.blob.vercel-storage.com'

export type SimpleWalkthroughMediaEntry = {
  screenshotUrl?: string
  videoUrl?: string
}

/** Step id -> screenshot and/or demo video (reuses platform walkthrough Blob assets). */
export const SIMPLE_WALKTHROUGH_MEDIA: Record<string, SimpleWalkthroughMediaEntry> = {
  concept: {
    screenshotUrl: '/landing/storyboard/intuitive-ux-2.png',
  },
  blueprint: {
    screenshotUrl: FEATURE_STORYBOARD_MEDIA[10]?.screenshotUrl,
    videoUrl: FEATURE_STORYBOARD_MEDIA[10]?.videoUrl,
  },
  'audience-resonance': {
    screenshotUrl: FEATURE_STORYBOARD_MEDIA[7]?.screenshotUrl,
    videoUrl: FEATURE_STORYBOARD_MEDIA[7]?.videoUrl,
  },
  'pre-vis': {},
  shoot: {
    screenshotUrl: FEATURE_STORYBOARD_MEDIA[11]?.screenshotUrl,
    videoUrl: FEATURE_STORYBOARD_MEDIA[11]?.videoUrl,
  },
  'screening-room': {
    screenshotUrl: SCREENING_ROOM_COPY.screenshotUrl,
    videoUrl: `${BLOB}/walkthrough/Premiere.mp4`,
  },
  publish: {
    screenshotUrl: FEATURE_STORYBOARD_MEDIA[13]?.screenshotUrl,
    videoUrl: `${BLOB}/walkthrough/Premiere.mp4`,
  },
}

export function getSimpleWalkthroughMedia(stepId: string): SimpleWalkthroughMediaEntry {
  return SIMPLE_WALKTHROUGH_MEDIA[stepId] ?? {}
}
