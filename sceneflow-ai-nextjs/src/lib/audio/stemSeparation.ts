import { enqueueStemSeparationJob, computeSourceHash } from '@/lib/audio/stemJobs'

export type StemSeparationStatus = 'pending' | 'processing' | 'complete' | 'failed' | 'skipped'

export type StemSeparationMode = 'sync' | 'async'

export interface StemSeparationContext {
  projectId: string
  sceneId: string
  segmentId: string
  takeId?: string
  userId?: string
}

export interface StemSeparationResult {
  status: StemSeparationStatus
  speechStemUrl?: string
  backgroundStemUrl?: string
  provider: string
  sourceHash?: string
  sourceAudioUrl?: string
  model?: string
  jobId?: string
  processingMs?: number
  confidence?: number
  processedAt?: string
  providerMeta?: Record<string, unknown>
  error?: string
}

export interface StemSeparationProvider {
  separate(sourceAudioUrl: string, options?: StemSeparationOptions): Promise<StemSeparationResult>
}

export interface StemSeparationOptions {
  mode?: StemSeparationMode
  context?: StemSeparationContext
  maxAttempts?: number
  model?: string
}

class EdenStemSeparationProvider implements StemSeparationProvider {
  async separate(sourceAudioUrl: string): Promise<StemSeparationResult> {
    const apiKey = process.env.EDEN_AI_API_KEY
    const endpoint = process.env.EDEN_AI_STEM_API_URL
    const sourceHash = computeSourceHash(sourceAudioUrl)

    if (!apiKey || !endpoint) {
      return {
        status: 'failed',
        provider: 'eden-ai',
        sourceHash,
        sourceAudioUrl,
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
        sourceHash,
        sourceAudioUrl,
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
        sourceHash,
        sourceAudioUrl,
        error: 'Stem separation response missing stem URLs',
        providerMeta: data,
      }
    }

    return {
      status: 'complete',
      provider: 'eden-ai',
      sourceHash,
      sourceAudioUrl,
      speechStemUrl,
      backgroundStemUrl,
      processedAt: new Date().toISOString(),
      providerMeta: data,
    }
  }
}

class DemucsStemSeparationProvider implements StemSeparationProvider {
  async separate(sourceAudioUrl: string, options?: StemSeparationOptions): Promise<StemSeparationResult> {
    const mode = options?.mode || ((process.env.STEM_SEPARATION_MODE || 'async').toLowerCase() as StemSeparationMode)
    const context = options?.context
    const sourceHash = computeSourceHash(sourceAudioUrl)
    const model = options?.model || process.env.DEMUCS_MODEL || 'htdemucs_ft'

    if (mode === 'async') {
      if (!context) {
        return {
          status: 'failed',
          provider: 'demucs',
          sourceHash,
          sourceAudioUrl,
          model,
          error: 'Demucs async mode requires context (projectId, sceneId, segmentId)',
        }
      }

      try {
        const job = await enqueueStemSeparationJob({
          ...context,
          sourceAudioUrl,
          sourceHash,
          model,
        })
        return {
          status: job.status,
          provider: 'demucs',
          sourceHash,
          sourceAudioUrl,
          model,
          jobId: job.jobId,
          processedAt: new Date().toISOString(),
          providerMeta: {
            mode: 'async',
            model,
            sourceHash,
          },
        }
      } catch (error) {
        return {
          status: 'failed',
          provider: 'demucs',
          sourceHash,
          sourceAudioUrl,
          model,
          error: error instanceof Error ? error.message : String(error),
        }
      }
    }

    return {
      status: 'failed',
      provider: 'demucs',
      sourceHash,
      sourceAudioUrl,
      model,
      error: 'Demucs sync mode is not enabled in this deployment. Use STEM_SEPARATION_MODE=async.',
    }
  }
}

class NoopStemSeparationProvider implements StemSeparationProvider {
  async separate(sourceAudioUrl: string): Promise<StemSeparationResult> {
    return {
      status: 'skipped',
      provider: 'none',
      sourceHash: computeSourceHash(sourceAudioUrl),
      sourceAudioUrl,
    }
  }
}

export function getStemSeparationProvider(): StemSeparationProvider {
  const provider = (process.env.STEM_SEPARATION_PROVIDER || 'none').toLowerCase()
  if (provider === 'eden') return new EdenStemSeparationProvider()
  if (provider === 'demucs') return new DemucsStemSeparationProvider()
  return new NoopStemSeparationProvider()
}

export async function separateAudioStemsWithRetry(
  sourceAudioUrl: string,
  options: StemSeparationOptions = {}
): Promise<StemSeparationResult> {
  const maxAttempts = options.maxAttempts ?? 3
  const provider = getStemSeparationProvider()
  let lastError: StemSeparationResult | null = null

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const result = await provider.separate(sourceAudioUrl, options)
    if (result.status === 'complete' || result.status === 'skipped' || result.status === 'processing' || result.status === 'pending') return result
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
