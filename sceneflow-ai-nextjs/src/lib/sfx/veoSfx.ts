/**
 * Veo native-audio SFX generation: low-cost T2V clip → extract MP3 → GCS.
 *
 * Video is discarded after audio extraction; only the audio URL is persisted.
 */

import {
  generateVideoWithVeo,
  waitForVideoCompletion,
} from '@/lib/gemini/videoClient'
import { downloadProductionVideo } from '@/lib/gemini/productionVideoClient'
import { uploadToGCS } from '@/lib/storage/gcsAssets'
import { extractAudioFromVideoBuffer } from '@/lib/sfx/extractAudioFromVideo'
import {
  resolveVeoSfxClipDuration,
  type VeoSfxClipDuration,
} from '@/lib/sfx/veoSfxDuration'

export interface BuildVeoSfxPromptResult {
  prompt: string
  negativePrompt: string
}

export interface GenerateVeoSfxParams {
  text: string
  projectId: string
  sfxId?: string
  sfxIndex?: number
  /** Resolved clip length (4 | 6 | 8). */
  clipDurationSeconds?: VeoSfxClipDuration
}

export interface GenerateVeoSfxResult {
  url: string
  gcsPath: string
  clipDurationSeconds: VeoSfxClipDuration
  byteLength: number
}

export function buildVeoSfxPrompt(description: string): BuildVeoSfxPromptResult {
  const trimmed = (description || '').trim()
  const prompt = [
    'Solid black frame with no visible scene.',
    `Continuous ambient sound design only: ${trimmed}.`,
    'Realistic environmental and foley audio for the full clip.',
    'No dialogue, no narration, no music, no singing, no speech.',
  ].join(' ')

  const negativePrompt = [
    'dialogue',
    'speech',
    'talking',
    'singing',
    'music',
    'score',
    'soundtrack',
    'narration',
    'voiceover',
    'lip sync',
    'lips moving',
  ].join(', ')

  return { prompt, negativePrompt }
}

async function downloadVeoVideoBuffer(videoUrl: string): Promise<Buffer> {
  if (videoUrl.startsWith('data:video')) {
    const b64 = videoUrl.split(',')[1]
    if (!b64) throw new Error('Invalid inline video data URL')
    return Buffer.from(b64, 'base64')
  }

  if (videoUrl.startsWith('file:')) {
    const buffer = await downloadProductionVideo(videoUrl.slice(5), 'vertex')
    if (!buffer) throw new Error('Failed to download Veo video file')
    return buffer
  }

  const buffer = await downloadProductionVideo(videoUrl, 'vertex')
  if (!buffer) throw new Error('Failed to download Veo video')
  return buffer
}

/**
 * Generates a low-cost Veo T2V clip, extracts audio, uploads MP3 to GCS.
 * Caller handles credit checking and charging.
 */
export async function generateVeoSfxAudio(
  params: GenerateVeoSfxParams
): Promise<GenerateVeoSfxResult> {
  const trimmedText = (params.text || '').trim()
  if (!trimmedText) {
    throw new Error('SFX prompt text is required')
  }
  if (!params.projectId) {
    throw new Error('projectId is required')
  }

  const clipDurationSeconds: VeoSfxClipDuration =
    params.clipDurationSeconds ?? resolveVeoSfxClipDuration(8)

  const { prompt, negativePrompt } = buildVeoSfxPrompt(trimmedText)

  console.log('[Veo SFX] Starting T2V ambient generation', {
    clipDurationSeconds,
    promptPreview: trimmedText.slice(0, 80),
  })

  const queued = await generateVideoWithVeo(prompt, {
    quality: 'fast',
    resolution: '720p',
    durationSeconds: clipDurationSeconds,
    aspectRatio: '16:9',
    negativePrompt,
  })

  if (!queued.operationName) {
    throw new Error(queued.error || 'Veo SFX generation failed to start')
  }

  const completed = await waitForVideoCompletion(queued.operationName, 240, 10)
  if (completed.status !== 'COMPLETED' || !completed.videoUrl) {
    throw new Error(completed.error || 'Veo SFX generation failed')
  }

  const videoBuffer = await downloadVeoVideoBuffer(completed.videoUrl)
  const audioBuffer = await extractAudioFromVideoBuffer(videoBuffer)

  const id = params.sfxId || (params.sfxIndex !== undefined ? `idx${params.sfxIndex}` : 'cue')
  const filename = `sfx-veo-${id}-${Date.now()}.mp3`

  const upload = await uploadToGCS(audioBuffer, {
    projectId: params.projectId,
    category: 'audio',
    subcategory: 'sfx',
    filename,
    contentType: 'audio/mpeg',
    metadata: {
      provider: 'veo',
      veoQuality: 'fast',
      clipDurationSeconds: String(clipDurationSeconds),
      promptPreview: trimmedText.slice(0, 200),
    },
  })

  return {
    url: upload.publicUrl || upload.url,
    gcsPath: upload.gcsPath,
    clipDurationSeconds,
    byteLength: audioBuffer.length,
  }
}
