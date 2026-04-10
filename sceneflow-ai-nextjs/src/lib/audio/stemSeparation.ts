export type StemSeparationStatus = 'pending' | 'processing' | 'complete' | 'failed' | 'skipped'

export interface StemSeparationResult {
  status: StemSeparationStatus
  speechStemUrl?: string
  backgroundStemUrl?: string
  provider: string
  providerMeta?: Record<string, unknown>
  error?: string
}

export interface StemSeparationProvider {
  separate(sourceAudioUrl: string): Promise<StemSeparationResult>
}

class EdenStemSeparationProvider implements StemSeparationProvider {
  async separate(sourceAudioUrl: string): Promise<StemSeparationResult> {
    const apiKey = process.env.EDEN_AI_API_KEY
    const endpoint = process.env.EDEN_AI_STEM_API_URL

    if (!apiKey || !endpoint) {
      return {
        status: 'failed',
        provider: 'eden-ai',
        error: 'Eden stem separation env not configured',
      }
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        audio_url: sourceAudioUrl,
        output: ['vocals', 'accompaniment'],
      }),
    })

    if (!response.ok) {
      const details = await response.text().catch(() => '')
      return {
        status: 'failed',
        provider: 'eden-ai',
        error: `Stem separation failed (${response.status}) ${details}`.trim(),
      }
    }

    const data = await response.json().catch(() => ({}))
    const speechStemUrl = data?.vocals_url || data?.speech_url
    const backgroundStemUrl = data?.accompaniment_url || data?.background_url

    if (!speechStemUrl && !backgroundStemUrl) {
      return {
        status: 'failed',
        provider: 'eden-ai',
        error: 'Stem separation response missing stem URLs',
        providerMeta: data,
      }
    }

    return {
      status: 'complete',
      provider: 'eden-ai',
      speechStemUrl,
      backgroundStemUrl,
      providerMeta: data,
    }
  }
}

class NoopStemSeparationProvider implements StemSeparationProvider {
  async separate(): Promise<StemSeparationResult> {
    return {
      status: 'skipped',
      provider: 'none',
    }
  }
}

export function getStemSeparationProvider(): StemSeparationProvider {
  const provider = (process.env.STEM_SEPARATION_PROVIDER || 'none').toLowerCase()
  if (provider === 'eden') return new EdenStemSeparationProvider()
  return new NoopStemSeparationProvider()
}

export async function separateAudioStemsWithRetry(
  sourceAudioUrl: string,
  maxAttempts: number = 3
): Promise<StemSeparationResult> {
  const provider = getStemSeparationProvider()
  let lastError: StemSeparationResult | null = null

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const result = await provider.separate(sourceAudioUrl)
    if (result.status === 'complete' || result.status === 'skipped') return result
    lastError = result
    if (attempt < maxAttempts) {
      const backoffMs = attempt * 750
      await new Promise((resolve) => setTimeout(resolve, backoffMs))
    }
  }

  return (
    lastError || {
      status: 'failed',
      provider: 'unknown',
      error: 'Stem separation failed',
    }
  )
}
