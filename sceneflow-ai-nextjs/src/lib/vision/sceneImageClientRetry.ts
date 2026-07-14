import { backoffMsFor429Attempt, sleep } from '@/lib/tts/googleTtsRetry'

/** Client-side retries after server returns 429 (matches TTS pattern). */
export const MAX_SCENE_IMAGE_CLIENT_429_RETRIES = 2

export function isSceneImageQuotaResponse(
  status: number,
  data: Record<string, unknown> | null | undefined
): boolean {
  if (status === 429) return true
  const record = data ?? {}
  return record.errorType === 'quota' || record.retryable === true
}

export type SceneGenerateImageFetchResult = {
  response: Response
  data: Record<string, unknown>
}

/**
 * POST /api/scene/generate-image with automatic 429 backoff retries.
 * Returns the final response (success or exhausted quota).
 */
export async function fetchSceneGenerateImageWith429Retry(
  body: Record<string, unknown>,
  options?: {
    onRetryScheduled?: (attempt: number, maxRetries: number, delayMs: number) => void
  }
): Promise<SceneGenerateImageFetchResult> {
  let response!: Response
  let data!: Record<string, unknown>

  for (let attempt = 0; attempt <= MAX_SCENE_IMAGE_CLIENT_429_RETRIES; attempt++) {
    response = await fetch('/api/scene/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    try {
      data = (await response.json()) as Record<string, unknown>
    } catch {
      throw new Error('Image generation failed (could not read server response)')
    }

    if (isSceneImageQuotaResponse(response.status, data)) {
      if (attempt < MAX_SCENE_IMAGE_CLIENT_429_RETRIES) {
        const delayMs = backoffMsFor429Attempt(attempt, response.headers.get('retry-after'))
        options?.onRetryScheduled?.(attempt + 1, MAX_SCENE_IMAGE_CLIENT_429_RETRIES, delayMs)
        await sleep(delayMs)
        continue
      }
      return { response, data }
    }

    break
  }

  return { response, data }
}
