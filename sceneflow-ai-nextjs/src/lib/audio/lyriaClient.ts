/**
 * Vertex Lyria 3 — Interactions API.
 *
 * Lyria 2 (`lyria-002` `:predict`) always returned a ~30s WAV. Lyria 3 Clip
 * still writes a 30s MP3; Lyria 3 Pro writes a full track whose length is
 * asked for in the prompt, up to 184 seconds. Duration is not an API field.
 */

import { isLyriaRecitationError } from '@/lib/audio/lyriaPromptAdapter'
import { estimateSceneBeatDuration } from '@/lib/script/sceneMusicCues'
import type { SceneBeat } from '@/lib/script/segmentTypes'

export const LYRIA_3_CLIP_MODEL = 'lyria-3-clip-preview'
export const LYRIA_3_PRO_MODEL = 'lyria-3-pro-preview'

/** Clip always writes this much; above it we switch to Pro. */
export const LYRIA_CLIP_MAX_SEC = 30
/** Vertex Pro documented maximum. */
export const LYRIA_PRO_MAX_SEC = 184
export const DEFAULT_REQUESTED_DURATION_SEC = 30
/** Mixer play-length ceiling — generation still caps at LYRIA_PRO_MAX_SEC. */
export const MAX_PLAY_DURATION_SEC = 600

const POLL_INTERVAL_MS = 3_000

export type Lyria3Model = typeof LYRIA_3_CLIP_MODEL | typeof LYRIA_3_PRO_MODEL

export type LyriaCallResult =
  | { ok: true; base64Data: string; mimeType: string }
  | { ok: false; status: number; body: string; recitation: boolean; timedOut?: boolean }

/** Play duration the UI asked for (1–600s). Generation may still clamp shorter. */
export function clampRequestedPlayDuration(requested: unknown): number {
  if (typeof requested === 'number' && Number.isFinite(requested) && requested > 0) {
    return Math.min(Math.round(requested), MAX_PLAY_DURATION_SEC)
  }
  return DEFAULT_REQUESTED_DURATION_SEC
}

/** Seconds we actually ask Lyria to write. */
export function clampGenerationDuration(requestedSec: number): number {
  if (!Number.isFinite(requestedSec) || requestedSec <= 0) {
    return DEFAULT_REQUESTED_DURATION_SEC
  }
  return Math.min(Math.round(requestedSec), LYRIA_PRO_MAX_SEC)
}

export function selectLyriaModel(generationSec: number): Lyria3Model {
  return generationSec > LYRIA_CLIP_MAX_SEC ? LYRIA_3_PRO_MODEL : LYRIA_3_CLIP_MODEL
}

/**
 * Scene/cue play length the generator should try to match.
 *
 * `musicDuration` is what the Play duration control was set to and wins
 * outright. Otherwise the beat timeline decides: it is what the animatic
 * actually plays, whereas `scene.duration` is the script LLM's estimate,
 * written before the beats were laid out and frequently half the real length —
 * which is how a two-minute scene asked for a thirty-second track.
 */
export function resolveMusicRequestDuration(scene: {
  musicDuration?: unknown
  duration?: unknown
  beats?: unknown
}): number {
  if (typeof scene.musicDuration === 'number' && scene.musicDuration > 0) {
    return scene.musicDuration
  }
  const beatTimeline = Array.isArray(scene.beats)
    ? estimateSceneBeatDuration(scene.beats as SceneBeat[])
    : 0
  if (beatTimeline > 0) {
    return beatTimeline
  }
  if (typeof scene.duration === 'number' && scene.duration > 0) {
    return scene.duration
  }
  return DEFAULT_REQUESTED_DURATION_SEC
}

/**
 * Pro has no duration parameter — the length has to live in the sentence.
 * Film underscore must keep saying instrumental; Pro otherwise writes songs.
 */
export function buildLyria3Prompt(adaptedBody: string, generationSec: number): string {
  const seconds = clampGenerationDuration(generationSec)
  const prefix = `Create a ${seconds}-second instrumental film underscore, no vocals, no lyrics.`
  const body = adaptedBody.trim()
  return body ? `${prefix} ${body}` : prefix
}

export function buildLyria3InteractionsBody(model: string, prompt: string): {
  model: string
  input: Array<{ type: 'text'; text: string }>
} {
  return {
    model,
    input: [{ type: 'text', text: prompt }],
  }
}

export function lyria3InteractionsEndpoint(projectId: string): string {
  return `https://aiplatform.googleapis.com/v1beta1/projects/${encodeURIComponent(projectId)}/locations/global/interactions`
}

export function lyria3InteractionStatusEndpoint(projectId: string, interactionId: string): string {
  return `${lyria3InteractionsEndpoint(projectId)}/${encodeURIComponent(interactionId)}`
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function interactionStatus(data: unknown): string {
  const record = asRecord(data)
  return typeof record?.status === 'string' ? record.status.toLowerCase() : ''
}

export function isLyriaInteractionCompleted(data: unknown): boolean {
  const status = interactionStatus(data)
  return status === 'completed' || status === 'succeeded' || status === 'success'
}

export function isLyriaInteractionFailed(data: unknown): boolean {
  const status = interactionStatus(data)
  if (status === 'failed' || status === 'error' || status === 'cancelled') return true
  return Boolean(asRecord(data)?.error)
}

export function getLyriaInteractionId(data: unknown): string | null {
  const record = asRecord(data)
  if (!record) return null
  if (typeof record.id === 'string' && record.id.trim()) {
    const raw = record.id.trim()
    const slash = raw.lastIndexOf('/')
    return slash >= 0 ? raw.slice(slash + 1) : raw
  }
  if (typeof record.name === 'string' && record.name.includes('/interactions/')) {
    return record.name.split('/interactions/').pop() || null
  }
  return null
}

function audioFromPart(part: unknown): { base64Data: string; mimeType: string } | null {
  const record = asRecord(part)
  if (!record) return null

  const type = typeof record.type === 'string' ? record.type.toLowerCase() : ''
  const mimeType =
    typeof record.mime_type === 'string'
      ? record.mime_type
      : typeof record.mimeType === 'string'
        ? record.mimeType
        : 'audio/mpeg'

  const data =
    (typeof record.data === 'string' && record.data) ||
    (typeof record.bytesBase64Encoded === 'string' && record.bytesBase64Encoded) ||
    (typeof record.audioContent === 'string' && record.audioContent) ||
    ''

  if ((type === 'audio' || mimeType.startsWith('audio/')) && data) {
    return { base64Data: data, mimeType }
  }
  return null
}

/**
 * Pull the MP3 (or WAV) out of a completed Interactions payload.
 *
 * Vertex returns `outputs[]` with `{ type: "audio", mime_type, data }`.
 * The Gemini-shaped twin exposes `output_audio` or nested `steps`.
 */
export function extractAudioFromLyriaInteraction(
  data: unknown
): { base64Data: string; mimeType: string } | null {
  const record = asRecord(data)
  if (!record) return null

  const outputAudio = asRecord(record.output_audio)
  if (outputAudio && typeof outputAudio.data === 'string' && outputAudio.data) {
    const mimeType =
      typeof outputAudio.mime_type === 'string' ? outputAudio.mime_type : 'audio/mpeg'
    return { base64Data: outputAudio.data, mimeType }
  }

  if (Array.isArray(record.outputs)) {
    for (const part of record.outputs) {
      const audio = audioFromPart(part)
      if (audio) return audio
    }
  }

  if (Array.isArray(record.steps)) {
    for (const step of record.steps) {
      const stepRecord = asRecord(step)
      const nested = stepRecord
        ? extractAudioFromLyriaInteraction(stepRecord)
        : audioFromPart(step)
      if (nested) return nested
    }
  }

  return null
}

function blobExtensionForMime(mimeType: string): { extension: string; contentType: string } {
  if (mimeType.includes('wav')) return { extension: 'wav', contentType: 'audio/wav' }
  return { extension: 'mp3', contentType: 'audio/mpeg' }
}

export function lyriaBlobMeta(mimeType: string): { extension: string; contentType: string } {
  return blobExtensionForMime(mimeType)
}

function failedResult(
  status: number,
  body: string,
  timedOut = false
): LyriaCallResult {
  return {
    ok: false,
    status,
    body,
    recitation: isLyriaRecitationError(body),
    timedOut,
  }
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text()
  try {
    return JSON.parse(text) as unknown
  } catch {
    return { raw: text }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * POST the Interactions request and, if Vertex has not finished, poll until
 * the attempt budget runs out.
 */
export async function callLyria3(options: {
  prompt: string
  model: string
  projectId: string
  accessToken: string
  timeoutMs: number
}): Promise<LyriaCallResult> {
  const { prompt, model, projectId, accessToken, timeoutMs } = options
  const deadline = Date.now() + timeoutMs
  const remainingMs = () => deadline - Date.now()

  const endpoint = lyria3InteractionsEndpoint(projectId)
  const requestBody = buildLyria3InteractionsBody(model, prompt)

  let response: Response
  try {
    const postBudget = Math.max(1, remainingMs())
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(postBudget),
    })
  } catch (error) {
    const timedOut =
      error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')
    return failedResult(
      timedOut ? 504 : 502,
      error instanceof Error ? error.message : String(error),
      timedOut
    )
  }

  if (!response.ok) {
    const errorText = await response.text()
    return failedResult(response.status, errorText)
  }

  let data = await readJson(response)

  const tryExtract = (payload: unknown): LyriaCallResult | null => {
    if (isLyriaInteractionFailed(payload)) {
      return failedResult(502, JSON.stringify(payload).slice(0, 800))
    }
    const audio = extractAudioFromLyriaInteraction(payload)
    if (audio) return { ok: true, ...audio }
    if (isLyriaInteractionCompleted(payload)) {
      return failedResult(500, JSON.stringify(payload).slice(0, 800))
    }
    return null
  }

  const immediate = tryExtract(data)
  if (immediate) return immediate

  const interactionId = getLyriaInteractionId(data)
  if (!interactionId) {
    return failedResult(500, JSON.stringify(data).slice(0, 800))
  }

  const statusUrl = lyria3InteractionStatusEndpoint(projectId, interactionId)

  while (remainingMs() > POLL_INTERVAL_MS) {
    await sleep(Math.min(POLL_INTERVAL_MS, Math.max(0, remainingMs() - 250)))
    if (remainingMs() <= 0) break

    let pollResponse: Response
    try {
      pollResponse = await fetch(statusUrl, {
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(Math.max(1, remainingMs())),
      })
    } catch (error) {
      const timedOut =
        error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')
      return failedResult(
        timedOut ? 504 : 502,
        error instanceof Error ? error.message : String(error),
        timedOut
      )
    }

    if (!pollResponse.ok) {
      const errorText = await pollResponse.text()
      return failedResult(pollResponse.status, errorText)
    }

    data = await readJson(pollResponse)
    const extracted = tryExtract(data)
    if (extracted) return extracted
  }

  return failedResult(504, 'Lyria 3 interaction timed out before audio was ready', true)
}
