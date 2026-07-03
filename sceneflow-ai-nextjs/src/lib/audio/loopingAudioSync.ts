/** Shared helpers for looping background music sync in timeline playback. */

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
