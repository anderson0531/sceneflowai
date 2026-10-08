/**
 * The promo stitch is started by one request and watched by the browser.
 * Holding the start request open until Cloud Run finishes is what the gateway
 * cuts off with a 504, which the page then fails to parse.
 */

export const PROMO_RENDER_POLL_MS = 5000
/** About ten minutes at the poll interval. */
export const PROMO_RENDER_MAX_ATTEMPTS = 120

export interface PromoRenderPollBody {
  status?: string
  downloadUrl?: string
  publicUrl?: string
  outputUrl?: string
  error?: string
  jobId?: string
  mp4Url?: string
  durationSec?: number
}

export function parsePromoRenderBody(status: number, body: string): PromoRenderPollBody {
  let parsed: unknown
  try {
    parsed = JSON.parse(body)
  } catch {
    throw new Error(`Trailer render failed (${status})`)
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new Error(`Trailer render failed (${status})`)
  }
  return parsed as PromoRenderPollBody
}

function playableUrl(...candidates: Array<string | undefined>): string | undefined {
  for (const candidate of candidates) {
    const url = candidate?.trim()
    if (url && (url.startsWith('https://') || url.startsWith('http://'))) return url
  }
  return undefined
}

export type PromoRenderPollStep =
  | { state: 'pending' }
  | { state: 'ready'; mp4Url: string }
  | { state: 'failed'; error: string }

/** A finished stitch is an HTTPS file. Anything else keeps waiting or fails. */
export function promoRenderPollStep(body: PromoRenderPollBody): PromoRenderPollStep {
  const status = body.status
  if (status === 'FAILED' || status === 'error') {
    return { state: 'failed', error: body.error || 'Trailer render failed' }
  }
  if (status === 'COMPLETED') {
    const mp4Url = playableUrl(body.downloadUrl, body.publicUrl, body.outputUrl, body.mp4Url)
    if (!mp4Url) {
      return { state: 'failed', error: 'Trailer render finished without a playable file' }
    }
    return { state: 'ready', mp4Url }
  }
  if (!status) {
    const immediate = playableUrl(body.mp4Url, body.downloadUrl, body.publicUrl, body.outputUrl)
    if (immediate) return { state: 'ready', mp4Url: immediate }
  }
  return { state: 'pending' }
}

export async function pollPromoRenderJob(opts: {
  jobId: string
  fetchStatus: (jobId: string) => Promise<{ status: number; body: string }>
  sleep?: (ms: number) => Promise<void>
  maxAttempts?: number
}): Promise<string> {
  const sleep = opts.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)))
  const maxAttempts = opts.maxAttempts ?? PROMO_RENDER_MAX_ATTEMPTS
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await sleep(PROMO_RENDER_POLL_MS)
    const response = await opts.fetchStatus(opts.jobId)
    const body = parsePromoRenderBody(response.status, response.body)
    const step = promoRenderPollStep(body)
    if (step.state === 'ready') return step.mp4Url
    if (step.state === 'failed') throw new Error(step.error)
  }
  throw new Error('Trailer render timed out')
}
