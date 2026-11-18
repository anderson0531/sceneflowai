import type {
  FeaturePanLocaleId,
  PortalAnimaticBeatId,
} from './customerPortalAnimaticCopy'

export interface CustomerPortalBeatAudioWindow {
  id: PortalAnimaticBeatId
  startSec: number
  endSec: number
}

export interface CustomerPortalLocaleAudioTiming {
  audioSrc: string
  totalDurationSec: number
  beats: readonly CustomerPortalBeatAudioWindow[]
}

/**
 * Populated automatically by `npx tsx scripts/stitch-customer-portal-narration.ts`
 * once studio narration tracks (`Charon` + ducked orchestral underscore) are stitched
 * into `public/landing/video-services/portal-animatic/customer-portal-<locale>.mp3`.
 */
export const CUSTOMER_PORTAL_AUDIO_MANIFEST: Partial<
  Record<FeaturePanLocaleId, CustomerPortalLocaleAudioTiming>
> = {}
