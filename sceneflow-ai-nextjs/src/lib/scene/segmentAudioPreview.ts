/** Per-beat embedded video audio settings used by Production Mixer preview. */
export interface BeatSegmentAudioConfig {
  includeAudio?: boolean
  volume?: number
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
