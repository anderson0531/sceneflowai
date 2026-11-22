import type { RenderSegment } from '@/lib/video/renderTypes'

export type PortraitFramingMode =
  | 'auto'
  | 'blur_pillarbox'
  | 'documentary_matte'
  | 'crop_fill'

export interface DocumentaryBridgeConfig {
  /** Seconds of the live subject intro voice that continue over the opening of the AI reenactment (L-Cut / J-Cut bleed) */
  audioBleedSec: number
  /** Dissolve duration bridging the live clip into the 4K AI reenactment */
  dissolveSec: number
  /** Automatic 16:9 widescreen framing treatment when the client uploaded a vertical 9:16 phone video */
  portraitFramingMode: PortraitFramingMode
  lowerThirdTitle?: string
  lowerThirdSubtitle?: string
}

export const DEFAULT_DOCUMENTARY_BRIDGE: DocumentaryBridgeConfig = {
  audioBleedSec: 2.5,
  dissolveSec: 0.75,
  portraitFramingMode: 'documentary_matte',
}

/**
 * Generates paired `RenderSegment` patches for a Netflix-style Documentary Bridge:
 *  - Live Subject Intro Segment: plays real camera video + original voice, enables vertical-to-16:9
 *    documentary matte if the upload was portrait (`9:16`), and extends audio tail-out (`audioTailOutSec`)
 *    so the subject's voice smoothly carries into the AI reenactment!
 *  - Following AI Reenactment Segment: enters via a soft dissolve (`transitionIn: 'dissolve'`) and
 *    accepts the subject's extracted narration audio stem if configured.
 */
export function buildLiveIntroToReenactmentBridge(input: {
  liveIntroSegment: RenderSegment
  reenactmentSegment: RenderSegment
  aspectOrientation?: 'landscape' | 'portrait' | 'square' | null
  extractedAudioUrl?: string | null
  config?: Partial<DocumentaryBridgeConfig>
}): {
  liveIntroSegment: RenderSegment
  reenactmentSegment: RenderSegment
} {
  const cfg: DocumentaryBridgeConfig = {
    ...DEFAULT_DOCUMENTARY_BRIDGE,
    ...(input.config || {}),
  }

  const clampedBleed = Math.min(5, Math.max(0, Number(cfg.audioBleedSec) || 0))
  const clampedDissolve = Math.min(2, Math.max(0, Number(cfg.dissolveSec) || 0))
  const isPortrait = input.aspectOrientation === 'portrait'

  const liveIntroSegment: RenderSegment = {
    ...input.liveIntroSegment,
    audioSource: input.liveIntroSegment.audioSource || 'original',
    audioTailOutSec: clampedBleed > 0 ? clampedBleed : input.liveIntroSegment.audioTailOutSec,
    ...(isPortrait
      ? {
          portraitFramingMode: cfg.portraitFramingMode,
          ...(cfg.lowerThirdTitle ? { lowerThirdTitle: cfg.lowerThirdTitle } : {}),
          ...(cfg.lowerThirdSubtitle ? { lowerThirdSubtitle: cfg.lowerThirdSubtitle } : {}),
        }
      : {}),
  }

  const reenactmentSegment: RenderSegment = {
    ...input.reenactmentSegment,
    ...(clampedDissolve > 0
      ? {
          transitionIn: 'dissolve',
          transitionInSec: clampedDissolve,
        }
      : {}),
    ...(input.extractedAudioUrl && !input.reenactmentSegment.voiceoverUrl
      ? {
          audioSource: 'voiceover',
          voiceoverUrl: input.extractedAudioUrl,
        }
      : {}),
  }

  return { liveIntroSegment, reenactmentSegment }
}

/**
 * Builds an FFmpeg complex filtergraph that frames a vertical (9:16) senior/mobile
 * selfie video gracefully inside a 16:9 widescreen 1080p/4K documentary canvas:
 *  - Background: scaled-to-fill blurred + subtly darkened/vignetted version of the clip
 *  - Foreground: sharp height-fitted portrait video centered cleanly with zero face cropping
 */
export function buildPortraitTo16x9DocumentaryFilter(options?: {
  width?: number
  height?: number
  mode?: PortraitFramingMode
}): string {
  const w = options?.width ?? 1920
  const h = options?.height ?? 1080
  const mode = options?.mode ?? 'documentary_matte'

  if (mode === 'crop_fill') {
    return `scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},setsar=1`
  }

  const bgDim = mode === 'documentary_matte' ? 'eq=brightness=-0.16:saturation=0.75' : 'eq=brightness=-0.08'
  const blurSigma = mode === 'documentary_matte' ? 28 : 20

  return (
    `split=2[bg][fg];` +
    `[bg]scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},gblur=sigma=${blurSigma},${bgDim},setsar=1[bg_out];` +
    `[fg]scale=-2:${h}:force_original_aspect_ratio=decrease,setsar=1[fg_out];` +
    `[bg_out][fg_out]overlay=(W-w)/2:(H-h)/2:shortest=1`
  )
}
