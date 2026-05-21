/**
 * Gemini Flash TTS (Cloud Text-to-Speech v1beta1).
 * Used by Blueprint share MP3 generation and /api/tts/google preview.
 */

import { getVertexAIAuthToken } from '@/lib/vertexai/client'
import { finalizeTextForGoogleTts } from '@/lib/tts/textOptimizer'
import { buildGeminiTtsPrompt } from '@/lib/tts/geminiTtsPrompt'

export const DEFAULT_BLUEPRINT_GEMINI_VOICE = 'gemini-Kore'

export const DEFAULT_GEMINI_TTS_MODEL =
  process.env.GEMINI_TTS_MODEL?.trim() || 'gemini-3.1-flash-tts-preview'

export function isGeminiTtsConfigured(): boolean {
  return !!(
    process.env.GOOGLE_API_KEY?.trim() ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON?.trim()
  )
}

/** True when id is a Cloud TTS Gemini voice (e.g. gemini-Kore). */
export function isBlueprintGeminiVoiceId(voiceId?: string): boolean {
  return !!voiceId?.trim().startsWith('gemini-')
}

/** Map legacy ElevenLabs narrator ids to default Gemini voice. */
export function normalizeBlueprintGeminiVoiceId(voiceId?: string): string {
  const id = voiceId?.trim()
  if (id && isBlueprintGeminiVoiceId(id)) return id
  return DEFAULT_BLUEPRINT_GEMINI_VOICE
}

export type SynthesizeGeminiFlashMp3Params = {
  text: string
  /** e.g. gemini-Kore */
  voiceId: string
  directorNotes?: string
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

function resolveGeminiVoiceName(voiceId: string): { googleVoice: string; actualVoiceName: string } {
  const googleVoice = voiceId.startsWith('gemini-') ? voiceId : `gemini-${voiceId}`
  return {
    googleVoice,
    actualVoiceName: googleVoice.replace(/^gemini-/, ''),
  }
}

export async function synthesizeGeminiFlashMp3(
  params: SynthesizeGeminiFlashMp3Params
): Promise<Buffer> {
  const sanitizedText = finalizeTextForGoogleTts(params.text)
  if (!sanitizedText.trim()) {
    return Buffer.alloc(0)
  }

  const { accessToken, apiKey } = await resolveGoogleTtsAuth()
  const voiceId = normalizeBlueprintGeminiVoiceId(params.voiceId)
  const { actualVoiceName } = resolveGeminiVoiceName(voiceId)
  const languageCode = params.languageCode?.trim() || 'en-US'
  const modelName = params.modelName?.trim() || DEFAULT_GEMINI_TTS_MODEL
  const timeoutMs = params.timeoutMs ?? 90_000

  let url = 'https://texttospeech.googleapis.com/v1beta1/text:synthesize'
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`
  } else if (apiKey) {
    url += `?key=${apiKey}`
  }

  const payload = {
    input: {
      text: sanitizedText,
      prompt: buildGeminiTtsPrompt({
        audioType: 'narration',
        voicePrompt: params.directorNotes,
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

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`Gemini TTS timed out after ${timeoutMs}ms`)
    }
    throw err
  } finally {
    clearTimeout(timer)
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
