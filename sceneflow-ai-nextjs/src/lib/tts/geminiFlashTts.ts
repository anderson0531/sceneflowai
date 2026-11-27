/**
 * Server-only Gemini Flash TTS (Cloud Text-to-Speech v1beta1).
 * Do not import this module from client components — use blueprintTtsConstants.ts instead.
 */

import { getVertexAIAuthToken } from '@/lib/vertexai/client'
import { finalizeTextForGeminiTts } from '@/lib/tts/textOptimizer'
import { buildGeminiTtsPrompt, type GeminiTtsAudioType } from '@/lib/tts/geminiTtsPrompt'
import {
  DEFAULT_BLUEPRINT_GEMINI_VOICE,
  DEFAULT_GEMINI_TTS_MODEL,
  normalizeBlueprintGeminiVoiceId,
} from '@/lib/tts/blueprintTtsConstants'
import { buildGeminiTtsAdvancedVoiceOptions } from '@/lib/tts/geminiTtsSafety'
import { fetchWithRetry } from '@/lib/utils/retry'

const GEMINI_TTS_BACKOFF_SCHEDULE_MS = [1500, 4000, 10000]
const GEMINI_TTS_MAX_RETRY_DELAY_MS = 30_000

function isRetryableTtsHttpError(error: any, status?: number): boolean {
  if (error?.name === 'AbortError' || error?.code === 'ABORT_ERR' || error?.code === 'TIMEOUT') {
    return false
  }
  return status === 429 || status === 502 || status === 503 || status === 504
}

export {
  DEFAULT_BLUEPRINT_GEMINI_VOICE,
  DEFAULT_GEMINI_TTS_MODEL,
  isGeminiTtsConfigured,
  isBlueprintGeminiVoiceId,
  normalizeBlueprintGeminiVoiceId,
} from '@/lib/tts/blueprintTtsConstants'

export type SynthesizeGeminiFlashMp3Params = {
  text: string
  /** e.g. gemini-Kore */
  voiceId: string
  directorNotes?: string
  /** Prompt style for the TTS performance. Defaults to 'narration'. */
  audioType?: GeminiTtsAudioType
  /** Per-line acting cues woven into the TTS prompt. */
  deliveryCues?: string[]
  /** Runtime scene wrapper from `buildSceneDirection`, appended after the persona. */
  sceneDirection?: string
  languageCode?: string
  modelName?: string
  timeoutMs?: number
}

async function resolveGoogleTtsAuth(): Promise<{ accessToken: string | null; apiKey: string | null }> {
  let accessToken: string | null = null
  try {
    accessToken = await getVertexAIAuthToken()
  } catch {
    /* fall back to API key */
  }
  const apiKey = process.env.GOOGLE_API_KEY?.trim() || null
  if (!accessToken && !apiKey) {
    throw new Error('Google TTS not configured (GOOGLE_API_KEY or Vertex service account)')
  }
  return { accessToken, apiKey }
}

function resolveGeminiVoiceName(voiceId: string): { actualVoiceName: string } {
  const googleVoice = voiceId.startsWith('gemini-') ? voiceId : `gemini-${voiceId}`
  return {
    actualVoiceName: googleVoice.replace(/^gemini-/, ''),
  }
}

export async function synthesizeGeminiFlashMp3(
  params: SynthesizeGeminiFlashMp3Params
): Promise<Buffer> {
  const sanitizedText = finalizeTextForGeminiTts(params.text)
  if (!sanitizedText.trim()) {
    return Buffer.alloc(0)
  }

  const { accessToken, apiKey } = await resolveGoogleTtsAuth()
  const voiceId = normalizeBlueprintGeminiVoiceId(params.voiceId)
  const { actualVoiceName } = resolveGeminiVoiceName(voiceId)
  const languageCode = params.languageCode?.trim() || 'en-US'
  const modelName =
    params.modelName?.trim() ||
    process.env.GEMINI_TTS_MODEL?.trim() ||
    DEFAULT_GEMINI_TTS_MODEL
  const timeoutMs = params.timeoutMs ?? 90_000

  let url = 'https://texttospeech.googleapis.com/v1beta1/text:synthesize'
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`
  } else if (apiKey) {
    url += `?key=${apiKey}`
  }

  const payload: Record<string, unknown> = {
    input: {
      text: sanitizedText,
      prompt: buildGeminiTtsPrompt({
        audioType: params.audioType ?? 'narration',
        voicePrompt: params.directorNotes,
        deliveryCues: params.deliveryCues,
        sceneDirection: params.sceneDirection,
      }),
    },
    voice: {
      languageCode,
      name: actualVoiceName,
      modelName,
    },
    audioConfig: {
      audioEncoding: 'MP3' as const,
    },
  }

  const advancedVoiceOptions = buildGeminiTtsAdvancedVoiceOptions()
  if (advancedVoiceOptions) {
    payload.advancedVoiceOptions = advancedVoiceOptions
  }

  let response: Response
  try {
    response = await fetchWithRetry(
      url,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      },
      {
        maxRetries: 3,
        backoffScheduleMs: GEMINI_TTS_BACKOFF_SCHEDULE_MS,
        maxDelayMs: GEMINI_TTS_MAX_RETRY_DELAY_MS,
        maxRetryAfterMs: GEMINI_TTS_MAX_RETRY_DELAY_MS,
        timeoutMs,
        operationName: 'Gemini Flash TTS',
        isRetryable: isRetryableTtsHttpError,
      }
    )
  } catch (err: any) {
    if (err?.code === 'TIMEOUT' || (err instanceof Error && err.name === 'AbortError')) {
      throw new Error(`Gemini TTS timed out after ${timeoutMs}ms`)
    }
    if (typeof err?.status === 'number') {
      throw new Error(
        `Gemini TTS failed: HTTP ${err.status} ${String(err.message || '').slice(0, 400)}`
      )
    }
    throw err
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => '')
    throw new Error(`Gemini TTS failed: HTTP ${response.status} ${errText.slice(0, 400)}`)
  }

  const data = (await response.json()) as { audioContent?: string }
  if (!data.audioContent) {
    throw new Error('Gemini TTS returned no audioContent')
  }

  return Buffer.from(data.audioContent, 'base64')
}
