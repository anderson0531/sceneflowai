/**
 * Map upstream AI/storage failures onto HTTP statuses and stable error codes so
 * clients can show an actionable message instead of a generic 500.
 */

export type AiErrorCode =
  | 'model_retired'
  | 'content_policy'
  | 'quota_exceeded'
  | 'auth_failed'
  | 'billing_denied'
  | 'not_configured'
  | 'upstream_timeout'
  | 'storage_failed'
  | 'out_of_memory'
  | 'unknown'

export interface ClassifiedAiError {
  status: number
  code: AiErrorCode
  message: string
  details: string
}

const RETIRED_MODEL_MESSAGE =
  'The image model this request used is no longer available. The server needs to be updated to a current Gemini image model.'

export function errorMessageOf(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'Unknown error'
}

/** Extract an upstream HTTP status from messages like "Vertex AI error 429: ...". */
export function upstreamStatusOf(error: unknown): number | undefined {
  const match = errorMessageOf(error).match(/\b(?:error|status)\s(\d{3})\b/i)
  if (!match) return undefined
  const status = Number(match[1])
  return Number.isFinite(status) ? status : undefined
}

export function classifyAiError(error: unknown): ClassifiedAiError {
  const details = errorMessageOf(error)
  const low = details.toLowerCase()
  const name = error instanceof Error ? error.name : ''
  const upstreamStatus = upstreamStatusOf(error)

  if (
    name === 'ImagenRetiredError' ||
    low.includes('imagen') &&
      (low.includes('retired') || low.includes('was not found') || upstreamStatus === 404)
  ) {
    return { status: 503, code: 'model_retired', message: RETIRED_MODEL_MESSAGE, details }
  }

  if (
    name === 'ContentPolicyExhaustedError' ||
    low.includes('content polic') ||
    low.includes('safety filter') ||
    low.includes('blocked') ||
    low.includes('rai ')
  ) {
    return {
      status: 422,
      code: 'content_policy',
      message:
        'Generation was blocked by content safety filters. Try rephrasing the prompt to be more descriptive and less sensitive.',
      details,
    }
  }

  if (low.includes('out of memory') || low.includes('heap') || low.includes('oom')) {
    return {
      status: 503,
      code: 'out_of_memory',
      message: 'The server ran out of memory. Try a smaller request or a narrower scope.',
      details,
    }
  }

  if (upstreamStatus === 429 || low.includes('rate limit') || low.includes('quota')) {
    return {
      status: 429,
      code: 'quota_exceeded',
      message: 'The AI provider is rate limiting requests. Please retry in a moment.',
      details,
    }
  }

  // Google Cloud billing dunning / locked account — not a bad service-account key.
  if (
    low.includes('lightning dunning') ||
    low.includes('dunning decision is deny') ||
    low.includes('account is locked due to a billing') ||
    (low.includes('billing') &&
      (low.includes('denied access') || low.includes('permission_denied') || upstreamStatus === 403))
  ) {
    return {
      status: 503,
      code: 'billing_denied',
      message:
        'Google Cloud billing is blocking Vertex AI for this project. Verify the billing account for VERTEX_PROJECT_ID (payment method / past-due invoice) in Google Cloud Console or AI Studio, then retry.',
      details,
    }
  }

  if (
    upstreamStatus === 401 ||
    upstreamStatus === 403 ||
    low.includes('authentication failed') ||
    low.includes('permission denied')
  ) {
    return {
      status: 502,
      code: 'auth_failed',
      message: 'The server could not authenticate with the AI provider.',
      details,
    }
  }

  if (low.includes('not configured') || low.includes('must be configured')) {
    return {
      status: 503,
      code: 'not_configured',
      message: 'The server is missing required AI configuration.',
      details,
    }
  }

  if (name === 'AbortError' || low.includes('timed out') || low.includes('timeout')) {
    return {
      status: 504,
      code: 'upstream_timeout',
      message: 'The AI provider timed out. Please try again.',
      details,
    }
  }

  if (low.includes('blob') || low.includes('upload')) {
    return {
      status: 502,
      code: 'storage_failed',
      message: 'The image was generated but could not be saved. Please try again.',
      details,
    }
  }

  return { status: 500, code: 'unknown', message: 'Unexpected server error', details }
}
