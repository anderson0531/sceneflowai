/**
 * Client helper for Gemini Lyria music generation via /api/tts/google/music.
 */

import {
  LYRIA_RECITATION_ERROR_CODE,
  LYRIA_RECITATION_USER_MESSAGE,
} from '@/lib/audio/lyriaPromptAdapter'

export interface GenerateMusicTrackParams {
  text: string
  duration?: number
  saveToBlob?: boolean
  projectId?: string
  sceneId?: string
}

export interface GenerateMusicTrackResult {
  url: string
  size?: number
  duration?: number
}

export class LyriaRecitationError extends Error {
  readonly code = LYRIA_RECITATION_ERROR_CODE

  constructor(message = LYRIA_RECITATION_USER_MESSAGE) {
    super(message)
    this.name = 'LyriaRecitationError'
  }
}

function parseMusicApiError(payload: unknown): string {
  const body = payload as { code?: string; error?: string; details?: string }
  if (body.code === LYRIA_RECITATION_ERROR_CODE) {
    return body.error || LYRIA_RECITATION_USER_MESSAGE
  }
  return body.error || body.details || 'Music generation failed'
}

export async function generateMusicTrack(
  params: GenerateMusicTrackParams
): Promise<GenerateMusicTrackResult> {
  const response = await fetch('/api/tts/google/music', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: params.text,
      duration: params.duration ?? 30,
      saveToBlob: params.saveToBlob ?? true,
      projectId: params.projectId,
      sceneId: params.sceneId,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    const message = parseMusicApiError(error)
    if ((error as { code?: string }).code === LYRIA_RECITATION_ERROR_CODE) {
      throw new LyriaRecitationError(message)
    }
    throw new Error(message)
  }

  const data = await response.json()
  if (!data?.url) {
    throw new Error('Music response missing audio URL')
  }

  return {
    url: data.url,
    size: data.size,
    duration: data.duration,
  }
}

/** Server-side variant (absolute baseUrl + auth cookie). */
export async function generateMusicTrackServer(
  baseUrl: string,
  params: GenerateMusicTrackParams,
  authCookie?: string
): Promise<GenerateMusicTrackResult | null> {
  try {
    const response = await fetch(`${baseUrl}/api/tts/google/music`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authCookie ? { Cookie: authCookie } : {}),
      },
      body: JSON.stringify({
        text: params.text,
        duration: params.duration ?? 30,
        saveToBlob: params.saveToBlob ?? true,
        projectId: params.projectId,
        sceneId: params.sceneId,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      let parsed: { code?: string; error?: string } = {}
      try {
        parsed = JSON.parse(errorText) as { code?: string; error?: string }
      } catch {
        // keep empty parsed
      }
      const message =
        parsed.code === LYRIA_RECITATION_ERROR_CODE
          ? parsed.error || LYRIA_RECITATION_USER_MESSAGE
          : errorText
      console.error('[generateMusicTrackServer] Failed:', message)
      return null
    }

    const result = await response.json()
    if (!result?.url) return null

    return {
      url: result.url,
      size: result.size,
      duration: result.duration,
    }
  } catch (error: unknown) {
    console.error(
      '[generateMusicTrackServer] Error:',
      error instanceof Error ? error.message : String(error)
    )
    return null
  }
}
