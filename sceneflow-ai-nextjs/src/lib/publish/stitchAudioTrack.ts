/**
 * Client-side audio stitching for YouTube MLA tracks.
 * Renders scheduled clips into a single MP3 via OfflineAudioContext + lamejs.
 */

import { LOCAL_RENDER_MAX_DURATION } from '@/lib/video/LocalRenderService'
import type { ScheduledAudioClip } from './buildLanguageAudioTrack'

export class AudioTrackTooLongError extends Error {
  constructor(duration: number) {
    super(
      `Video is ${Math.round(duration)}s — in-browser audio track generation supports up to ${LOCAL_RENDER_MAX_DURATION}s.`
    )
    this.name = 'AudioTrackTooLongError'
  }
}

const SAMPLE_RATE = 44100

function floatToInt16(float32: Float32Array): Int16Array {
  const int16 = new Int16Array(float32.length)
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]))
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }
  return int16
}

async function fetchAndDecode(
  ctx: BaseAudioContext,
  url: string
): Promise<AudioBuffer> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch audio: ${url} (${res.status})`)
  const arrayBuffer = await res.arrayBuffer()
  return ctx.decodeAudioData(arrayBuffer)
}

async function encodeMp3(audioBuffer: AudioBuffer): Promise<Blob> {
  const lamejs = await import('lamejs')
  const Mp3Encoder = lamejs.Mp3Encoder
  if (!Mp3Encoder) throw new Error('lamejs Mp3Encoder not available')

  const channels = audioBuffer.numberOfChannels
  const sampleRate = audioBuffer.sampleRate
  const encoder = new Mp3Encoder(channels, sampleRate, 128)

  const left = floatToInt16(audioBuffer.getChannelData(0))
  const right = channels > 1 ? floatToInt16(audioBuffer.getChannelData(1)) : left

  const blockSize = 1152
  const mp3Chunks: Uint8Array[] = []

  for (let i = 0; i < left.length; i += blockSize) {
    const leftChunk = left.subarray(i, i + blockSize)
    const rightChunk = right.subarray(i, i + blockSize)
    const buf: Int8Array =
      channels > 1
        ? encoder.encodeBuffer(leftChunk, rightChunk)
        : encoder.encodeBuffer(leftChunk)
    if (buf.length > 0) mp3Chunks.push(new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength))
  }

  const end: Int8Array = encoder.flush()
  if (end.length > 0) mp3Chunks.push(new Uint8Array(end.buffer, end.byteOffset, end.byteLength))

  return new Blob(mp3Chunks as BlobPart[], { type: 'audio/mpeg' })
}

export interface StitchAudioTrackOptions {
  clips: ScheduledAudioClip[]
  totalDuration: number
  onProgress?: (pct: number) => void
}

/**
 * Stitch scheduled clips into a single MP3 Blob aligned to totalDuration.
 */
export async function stitchAudioTrack({
  clips,
  totalDuration,
  onProgress,
}: StitchAudioTrackOptions): Promise<Blob> {
  if (totalDuration <= 0) {
    throw new Error('No audio timeline — render your production first.')
  }
  if (totalDuration > LOCAL_RENDER_MAX_DURATION) {
    throw new AudioTrackTooLongError(totalDuration)
  }

  onProgress?.(5)

  const totalSamples = Math.ceil(totalDuration * SAMPLE_RATE)
  const offlineCtx = new OfflineAudioContext(2, totalSamples, SAMPLE_RATE)

  // Decode all unique URLs
  const urlToBuffer = new Map<string, AudioBuffer>()
  const uniqueUrls = [...new Set(clips.map((c) => c.url))]
  for (let i = 0; i < uniqueUrls.length; i++) {
    const url = uniqueUrls[i]
    try {
      const buffer = await fetchAndDecode(offlineCtx, url)
      urlToBuffer.set(url, buffer)
    } catch (err) {
      console.warn(`[stitchAudioTrack] Skipping clip ${url}:`, err)
    }
    onProgress?.(5 + Math.round((i / uniqueUrls.length) * 40))
  }

  // Schedule clips
  for (const clip of clips) {
    const buffer = urlToBuffer.get(clip.url)
    if (!buffer) continue

    const source = offlineCtx.createBufferSource()
    source.buffer = buffer

    const gainNode = offlineCtx.createGain()
    gainNode.gain.value = clip.volume ?? 1

    source.connect(gainNode)
    gainNode.connect(offlineCtx.destination)

    const startTime = Math.max(0, clip.startTime)
    const maxDuration = Math.max(0, totalDuration - startTime)
    const playDuration = Math.min(clip.duration, buffer.duration, maxDuration)
    if (playDuration <= 0) continue

    source.start(startTime, 0, playDuration)
  }

  onProgress?.(55)
  const rendered = await offlineCtx.startRendering()
  onProgress?.(85)

  const mp3Blob = await encodeMp3(rendered)
  onProgress?.(100)
  return mp3Blob
}

/**
 * Upload a stitched MP3 blob to Vercel Blob storage.
 */
export async function uploadAudioTrackBlob(
  blob: Blob,
  projectId: string,
  language: string
): Promise<string> {
  const formData = new FormData()
  formData.append('file', blob, `mla-${language}.mp3`)
  formData.append('projectId', projectId)
  formData.append('language', language)

  const res = await fetch('/api/publish/audio-upload', {
    method: 'POST',
    body: formData,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Audio upload failed')
  return data.url as string
}
