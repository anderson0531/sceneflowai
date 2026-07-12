/** Per-beat embedded video audio settings used by Production Mixer preview + render. */
export interface BeatSegmentAudioConfig {
  includeAudio?: boolean
  volume?: number
}

export interface SegmentEmbedAudioStemGate {
  useStemDubbingPolicy: boolean
  includeSpeechStem: boolean
  hasBackgroundStem: boolean
}

export type SegmentEmbedAudioSource = 'original' | 'none'

export interface SegmentEmbedAudioRenderResult {
  audioSource: SegmentEmbedAudioSource
  audioVolume: number
  includeVideoAudio: boolean
}

export function resolveBeatPreviewVolume(
  cfg: BeatSegmentAudioConfig | undefined,
  master: number,
  isMuted: boolean
): { muted: boolean; volume: number } {
  const include = cfg?.includeAudio ?? true
  const muted = isMuted || !include
  if (muted) {
    return { muted: true, volume: 0 }
  }
  const vol = (cfg?.volume ?? 1) * master
  return { muted: false, volume: Math.min(1, Math.max(0, vol)) }
}

/** Resolve embedded beat video audio for export (server/local/headless render). */
export function resolveSegmentEmbedAudioForRender(
  cfg: BeatSegmentAudioConfig | undefined,
  master: number,
  stemGate: SegmentEmbedAudioStemGate
): SegmentEmbedAudioRenderResult {
  const effectiveVolume = Math.min(1, Math.max(0, (cfg?.volume ?? 1) * master))
  const include = cfg?.includeAudio ?? true
  const stemAllowsOriginal =
    !stemGate.useStemDubbingPolicy ||
    stemGate.includeSpeechStem ||
    !stemGate.hasBackgroundStem
  const useOriginal = include && effectiveVolume > 0 && stemAllowsOriginal
  return {
    audioSource: useOriginal ? 'original' : 'none',
    audioVolume: effectiveVolume,
    includeVideoAudio: useOriginal,
  }
}

export function anySegmentEmbedAudioIncluded(
  segments: Array<{ segmentId: string; stemSeparation?: { backgroundStemUrl?: string } }>,
  configs: Record<string, BeatSegmentAudioConfig>,
  master: number,
  useStemDubbingPolicy: boolean,
  includeSpeechStem: boolean
): boolean {
  return segments.some((seg) => {
    const embed = resolveSegmentEmbedAudioForRender(configs[seg.segmentId], master, {
      useStemDubbingPolicy,
      includeSpeechStem,
      hasBackgroundStem: !!seg.stemSeparation?.backgroundStemUrl,
    })
    return embed.audioSource === 'original'
  })
}

/** True when beat embed audio is unmuted (used to gate background stem injection). */
export function isBeatEmbedAudioIncluded(
  cfg: BeatSegmentAudioConfig | undefined
): boolean {
  return cfg?.includeAudio ?? true
}
