/**
 * Shared ElevenLabs SFX (sound-generation) helper.
 *
 * Encapsulates the call to the ElevenLabs `/v1/sound-generation` endpoint and
 * the GCS upload step so both the per-cue API route and the Express audio
 * pipeline can reuse the same code path.
 */

import { uploadToGCS } from '@/lib/storage/gcsAssets'
import { fetchWithRetry } from '@/lib/utils/retry'

const ELEVENLABS_SFX_BACKOFF_SCHEDULE_MS = [1500, 4000, 10000]
const ELEVENLABS_SFX_MAX_RETRY_DELAY_MS = 30_000

function isRetryableElevenLabsSfxError(error: any, status?: number): boolean {
  if (error?.name === 'AbortError' || error?.code === 'ABORT_ERR' || error?.code === 'TIMEOUT') {
    return false
  }
  return status === 429 || status === 502 || status === 503 || status === 504
}

export interface GenerateElevenLabsSfxParams {
  /** Required: descriptive prompt of the sound effect (e.g. "thunder crack"). */
  text: string
  /** Optional: requested duration in seconds. Clamped to [0.5, 22]. */
  durationSeconds?: number
  /** Optional: how strictly the generation follows the prompt. Clamped to [0, 1]. Default 0.3. */
  promptInfluence?: number
  /** Required for storage path: project to scope this asset to. */
  projectId: string
  /** Required for filename: stable id for the SFX cue. */
  sfxId?: string
  /** Optional: legacy positional index (used in the GCS filename when sfxId is missing). */
  sfxIndex?: number
}

export interface GenerateElevenLabsSfxResult {
  url: string
  gcsPath: string
  durationSeconds: number | null
  byteLength: number
}

/**
 * Calls ElevenLabs `text-to-sound-effects` and uploads the resulting MP3 to GCS.
 * Caller is responsible for credit checking and charging around this helper.
 */
export async function generateElevenLabsSfx(
  params: GenerateElevenLabsSfxParams
): Promise<GenerateElevenLabsSfxResult> {
  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY is not configured')
  }
  const trimmedText = (params.text || '').trim()
  if (!trimmedText) {
    throw new Error('SFX prompt text is required')
  }

  const clampedDuration =
    typeof params.durationSeconds === 'number' && Number.isFinite(params.durationSeconds)
      ? Math.min(22, Math.max(0.5, params.durationSeconds))
      : null
  const clampedInfluence =
    typeof params.promptInfluence === 'number' && Number.isFinite(params.promptInfluence)
      ? Math.min(1, Math.max(0, params.promptInfluence))
      : 0.3

  const body: Record<string, unknown> = {
    text: trimmedText,
    prompt_influence: clampedInfluence,
    output_format: 'mp3_44100_128',
  }
  if (clampedDuration !== null) {
    body.duration_seconds = clampedDuration
  }

  let response: Response
  try {
    response = await fetchWithRetry(
      'https://api.elevenlabs.io/v1/sound-generation',
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify(body),
      },
      {
        maxRetries: 3,
        backoffScheduleMs: ELEVENLABS_SFX_BACKOFF_SCHEDULE_MS,
        maxDelayMs: ELEVENLABS_SFX_MAX_RETRY_DELAY_MS,
        maxRetryAfterMs: ELEVENLABS_SFX_MAX_RETRY_DELAY_MS,
        timeoutMs: 90_000,
        operationName: 'ElevenLabs SFX',
        isRetryable: isRetryableElevenLabsSfxError,
      }
    )
  } catch (err: any) {
    if (typeof err?.status === 'number') {
      throw new Error(
        `ElevenLabs sound-generation failed: HTTP ${err.status} ${String(err.message || '').slice(0, 200)}`
      )
    }
    throw err
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => '')
    throw new Error(
      `ElevenLabs sound-generation failed: HTTP ${response.status} ${errText.slice(0, 200)}`
    )
  }

  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const id = params.sfxId || (params.sfxIndex !== undefined ? `idx${params.sfxIndex}` : 'cue')
  const filename = `sfx-${id}-${Date.now()}.mp3`

  const upload = await uploadToGCS(buffer, {
    projectId: params.projectId,
    category: 'audio',
    subcategory: 'sfx',
    filename,
    contentType: 'audio/mpeg',
    metadata: {
      provider: 'elevenlabs',
      promptInfluence: String(clampedInfluence),
      durationSecondsRequested: clampedDuration !== null ? String(clampedDuration) : '',
      promptPreview: trimmedText.slice(0, 200),
    },
  })

  return {
    url: upload.publicUrl || upload.url,
    gcsPath: upload.gcsPath,
    durationSeconds: clampedDuration,
    byteLength: buffer.length,
  }
}
