/** Shared helpers for looping background music sync in timeline playback. */

export const AUDIO_PLAYBACK_RATE_MIN = 0.5
export const AUDIO_PLAYBACK_RATE_MAX = 1.5
export const MUSIC_FADE_MAX_SEC = 15

export function clampAudioPlaybackRate(rate: number | undefined): number {
  if (rate == null || !Number.isFinite(rate)) return 1
  return Math.min(AUDIO_PLAYBACK_RATE_MAX, Math.max(AUDIO_PLAYBACK_RATE_MIN, rate))
}

/** Volume multiplier (0–1) from fade-in / fade-out envelope relative to clip play window. */
export function computeMusicVolumeMultiplier(
  localTimeSec: number,
  playDurationSec: number,
  fadeInSec: number,
  fadeOutSec: number
): number {
  if (playDurationSec <= 0) return 0
  const t = Math.max(0, localTimeSec)
  const fi = Math.max(0, Math.min(fadeInSec, playDurationSec / 2))
  const fo = Math.max(0, Math.min(fadeOutSec, playDurationSec / 2))

  let mult = 1
  if (fi > 0 && t < fi) {
    mult *= t / fi
  }
  if (fo > 0) {
    const timeUntilEnd = playDurationSec - t
    if (timeUntilEnd < fo) {
      mult *= Math.max(0, timeUntilEnd / fo)
    }
  }
  return mult
}

export interface LoopingClipTiming {
  startTime: number
  trimStart?: number
  loop?: boolean
}

export function computeClipAudioTime(
  clip: LoopingClipTiming,
  elapsed: number,
  audioDuration: number
): number {
  const rawTime = elapsed - clip.startTime + (clip.trimStart || 0)
  if (clip.loop && audioDuration > 0 && Number.isFinite(audioDuration)) {
    return ((rawTime % audioDuration) + audioDuration) % audioDuration
  }
  return rawTime
}

export function loopingDrift(
  audioTime: number,
  currentTime: number,
  audioDuration: number
): number {
  if (audioDuration <= 0) return Math.abs(currentTime - audioTime)
  const direct = Math.abs(currentTime - audioTime)
  const wrappedForward = Math.abs(currentTime - (audioTime + audioDuration))
  const wrappedBackward = Math.abs(currentTime - (audioTime - audioDuration))
  return Math.min(direct, wrappedForward, wrappedBackward)
}

/** Parse duration in seconds from a WAV buffer (Lyria outputs 48kHz stereo PCM). */
export function getWavDurationSeconds(buffer: Buffer): number {
  if (buffer.length < 44) return 30
  if (buffer.toString('ascii', 0, 4) !== 'RIFF') {
    return buffer.length / (48000 * 2 * 2)
  }
  const numChannels = buffer.readUInt16LE(22)
  const sampleRate = buffer.readUInt32LE(24)
  const bitsPerSample = buffer.readUInt16LE(34)
  const bytesPerSample = bitsPerSample / 8
  if (sampleRate <= 0 || numChannels <= 0 || bytesPerSample <= 0) return 30

  let dataSize = buffer.length - 44
  if (buffer.toString('ascii', 36, 40) === 'data') {
    dataSize = buffer.readUInt32LE(40)
  }

  const byteRate = sampleRate * numChannels * bytesPerSample
  if (byteRate <= 0) return 30
  return dataSize / byteRate
}
