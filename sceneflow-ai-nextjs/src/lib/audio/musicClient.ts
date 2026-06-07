/**
 * Client helper for Gemini Lyria music generation via /api/tts/google/music.
 */

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
    throw new Error(
      (error as { details?: string; error?: string }).details ||
        (error as { error?: string }).error ||
        'Music generation failed'
    )
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
      console.error('[generateMusicTrackServer] Failed:', errorText)
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
