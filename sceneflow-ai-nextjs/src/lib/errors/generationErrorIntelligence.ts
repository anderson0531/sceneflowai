/**
 * Unified Intelligent Error Evaluation for Still and Clip Generation.
 *
 * Converts raw upstream AI/API errors (Vertex Omni, Veo, Gemini Image, Kling,
 * Renderful, storage, rate limits, credits) into clear, non-technical explanations,
 * deterministic recovery CTAs, and customer-support escalation metadata.
 *
 * Safe to import in both server routes and client components.
 */

export type GenerationMediaType = 'still' | 'clip'

export type GenerationErrorCategory =
  | 'ftv_content_policy'
  | 'content_policy'
  | 'identity_declined'
  | 'character_likeness'
  | 'missing_references'
  | 'extension_ref_expired'
  | 'missing_prerequisite'
  | 'rate_limited'
  | 'insufficient_credits'
  | 'session_expired'
  | 'permission_denied'
  | 'provider_unavailable'
  | 'timeout'
  | 'cancelled'
  | 'storage_failed'
  | 'invalid_request'
  | 'unexpected'

export type GenerationRecoveryAction =
  | 'rerun'
  | 'retry_i2v'
  | 'rewrite_director'
  | 'switch_creative'
  | 'regenerate_previous'
  | 'open_references'
  | 'top_up_credits'
  | 'refresh_session'
  | 'dismiss'

export interface EvaluatedGenerationCta {
  action: GenerationRecoveryAction
  label: string
}

export interface EvaluatedGenerationError {
  mediaType: GenerationMediaType
  category: GenerationErrorCategory
  severity: 'warning' | 'error'
  title: string
  explanation: string
  suggestion: string
  /** Concise 1-line summary for compact tiles, rail tooltips, and agent docks */
  shortSummary: string
  primaryCta: EvaluatedGenerationCta
  secondaryCta?: EvaluatedGenerationCta
  /** True when the failure occurred before a billable asset completed */
  noCreditsCharged: boolean
  /** Whether to offer the "Report to Support" escalation button */
  canReportToSupport: boolean
  /** True when CTA is Rerun or error indicates an upstream/system issue */
  recommendSupportEscalation: boolean
  retryAfterSeconds?: number
  /** Raw upstream error preserved strictly for collapsible details & support tickets */
  technicalDetails?: string
}

export interface EvaluateGenerationErrorInput {
  mediaType: GenerationMediaType
  rawError?: unknown
  statusCode?: number
  errorCode?: string | null
  generationMethod?: string | null
  provider?: string | null
  hasStartFrame?: boolean
  isFTVRelated?: boolean
  retryAfterSeconds?: number
}

const CONTENT_POLICY_MARKERS = [
  'content_policy_violation',
  'image_content_policy',
  'content_blocked',
  'content safety filter',
  'content policy',
  'safety filter',
  'safety policies',
  'rai media filtered',
  'rai filter',
  'responsible ai',
  'blocked by safety',
  'blocked by google',
  'policy reason',
  'request blocked',
  'blocked due to',
  'prohibited content',
  'prohibited contents',
  'usage guidelines',
  'filtered by',
  'prompt was blocked',
  'image generation blocked',
  'finishreason=safety',
  'finishreason=image_safety',
  'mix of references',
  'kling_hive_guard',
  'violates',
]

const IDENTITY_DECLINED_MARKERS = [
  'image_safety',
  'references were declined',
  'without the character references',
  'character references declined',
]

const RATE_LIMIT_MARKERS = [
  'resource_exhausted',
  'rate limit',
  'rate-limit',
  'quota exceeded',
  'quota limit',
  'too many requests',
  'identity-ref rate limit',
  'rate limited',
]

const TIMEOUT_MARKERS = [
  'deadline_exceeded',
  'gateway timeout',
  'timed out',
  'timeout',
  'etimedout',
  'taking too long',
]

const CANCELLED_MARKERS = [
  'frame_agent_cancelled',
  'stills agent cancelled',
  'abortedbyclient',
  'the operation was aborted',
  'request aborted',
]

const STORAGE_MARKERS = [
  'could not be saved',
  'failed to save',
  'vercel-blob',
  'blob upload',
  'upload failed',
  'returned base64 data',
]

const PROVIDER_UNAVAILABLE_MARKERS = [
  'aggregator_not_configured',
  'creative_kling_unavailable',
  'kling_not_configured',
  'direct kling api is not configured',
  'multiplatform video is not configured',
  'creative is unavailable until kling',
  'lightning dunning',
  'dunning decision is deny',
  'account is locked due to a billing',
  'billing account',
  'authentication failed',
  'invalid api key',
  'invalid credentials',
  'was not found',
  'no longer available',
  'model_retired',
  'service unavailable',
  'temporarily unavailable',
  'bad gateway',
  'internal error encountered',
  'econnreset',
  'enotfound',
]

const INVALID_REQUEST_MARKERS = [
  'invalid_argument',
  'invalid json payload',
  'invalid request format',
  'interactions error 400',
  'unknown parameter',
  'unknown field',
  'unknown name',
]

function matchesAny(haystack: string, markers: readonly string[]): boolean {
  return markers.some((m) => haystack.includes(m))
}

/**
 * Extract the best raw diagnostic text from any error value or response object.
 */
export function extractRawErrorText(error: unknown): string {
  if (!error) return ''
  if (typeof error === 'string') return error.trim()
  if (error instanceof Error) {
    const extra = error as Error & {
      technicalDetails?: string
      details?: string
      googleError?: string
    }
    const parts = [
      error.message,
      extra.technicalDetails,
      extra.details,
      extra.googleError,
    ].filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    return [...new Set(parts.map((p) => p.trim()))].join('\n\n')
  }
  if (typeof error === 'object') {
    const obj = error as Record<string, unknown>
    const parts = [
      obj.error,
      obj.message,
      obj.technicalDetails,
      obj.vertexDetails,
      obj.details,
      obj.googleError,
    ].filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    if (parts.length > 0) {
      return [...new Set(parts.map((p) => p.trim()))].join('\n\n')
    }
    try {
      return JSON.stringify(error)
    } catch {
      return String(error)
    }
  }
  return String(error).trim()
}

/**
 * Extract embedded HTTP status code if not explicitly supplied.
 */
function inferStatusCode(rawText: string, error: unknown, explicit?: number): number | undefined {
  if (typeof explicit === 'number' && Number.isFinite(explicit)) return explicit
  if (error && typeof error === 'object') {
    const obj = error as { status?: unknown; statusCode?: unknown; response?: { status?: unknown } }
    if (typeof obj.status === 'number') return obj.status
    if (typeof obj.statusCode === 'number') return obj.statusCode
    if (typeof obj.response?.status === 'number') return obj.response.status
  }
  const match = rawText.match(/\b(?:HTTP|status|error)\s+(\d{3})\b/i)
  if (match) {
    const parsed = Number(match[1])
    if (Number.isFinite(parsed)) return parsed
  }
  return undefined
}

function inferErrorCode(error: unknown, explicit?: string | null): string {
  if (explicit?.trim()) return explicit.trim()
  if (error && typeof error === 'object') {
    const obj = error as {
      code?: unknown
      errorType?: unknown
      payload?: { code?: unknown }
      contentPolicyData?: { code?: unknown }
    }
    if (typeof obj.code === 'string' && obj.code.trim()) return obj.code.trim()
    if (typeof obj.payload?.code === 'string' && obj.payload.code.trim()) {
      return obj.payload.code.trim()
    }
    if (typeof obj.contentPolicyData?.code === 'string' && obj.contentPolicyData.code.trim()) {
      return obj.contentPolicyData.code.trim()
    }
    if (typeof obj.errorType === 'string' && obj.errorType.trim()) return obj.errorType.trim()
  }
  return ''
}

function inferRetryAfterSeconds(rawText: string, error: unknown, explicit?: number): number | undefined {
  if (typeof explicit === 'number' && explicit > 0) return Math.ceil(explicit)
  if (error && typeof error === 'object') {
    const retryAfter = (error as { retryAfter?: unknown }).retryAfter
    if (typeof retryAfter === 'number' && retryAfter > 0) return Math.ceil(retryAfter)
  }
  const waitMatch = rawText.match(/\bwait\s+(\d+)\s*s(?:ec(?:ond)?s?)?\b/i)
  if (waitMatch) return Number(waitMatch[1])
  const retryMatch = rawText.match(/\bretry\s+in\s+(\d+(?:\.\d+)?)s\b/i)
  if (retryMatch) return Math.ceil(Number(retryMatch[1]))
  return undefined
}

/**
 * Check if an error object already carries a server-evaluated `userGuidance` payload.
 */
export function extractAttachedUserGuidance(error: unknown): EvaluatedGenerationError | null {
  if (!error || typeof error !== 'object') return null
  const candidate = (error as { userGuidance?: unknown }).userGuidance
  if (
    candidate &&
    typeof candidate === 'object' &&
    typeof (candidate as EvaluatedGenerationError).title === 'string' &&
    typeof (candidate as EvaluatedGenerationError).explanation === 'string' &&
    typeof (candidate as EvaluatedGenerationError).primaryCta?.label === 'string'
  ) {
    return candidate as EvaluatedGenerationError
  }
  return null
}

/**
 * Deterministically evaluate any Still or Clip generation error into a concise,
 * user-friendly explanation, primary/secondary CTA, and support escalation flag.
 */
export function evaluateGenerationError(
  input: EvaluateGenerationErrorInput
): EvaluatedGenerationError {
  const attached = extractAttachedUserGuidance(input.rawError)
  if (attached && attached.mediaType === input.mediaType) {
    return attached
  }

  const { mediaType } = input
  const mediaNoun = mediaType === 'clip' ? 'clip' : 'still'
  const mediaTitleNoun = mediaType === 'clip' ? 'Clip' : 'Still'
  const rerunLabel = mediaType === 'clip' ? 'Rerun Clip' : 'Rerun Still'

  const rawText = extractRawErrorText(input.rawError)
  const low = rawText.toLowerCase()
  const code = inferErrorCode(input.rawError, input.errorCode)
  const codeLow = code.toLowerCase()
  const status = inferStatusCode(rawText, input.rawError, input.statusCode)
  const retryAfterSeconds = inferRetryAfterSeconds(rawText, input.rawError, input.retryAfterSeconds)
  const methodUpper = (input.generationMethod || '').toUpperCase()
  const providerLow = (input.provider || '').toLowerCase()
  const technicalDetails = rawText || undefined

  // 1. Cancelled / Aborted
  if (
    status === 499 ||
    codeLow === 'frame_agent_cancelled' ||
    codeLow === 'abortedbyclient' ||
    low === 'cancelled' ||
    matchesAny(low, CANCELLED_MARKERS)
  ) {
    return {
      mediaType,
      category: 'cancelled',
      severity: 'warning',
      title: 'Generation Cancelled',
      explanation: `This ${mediaNoun} generation was stopped before it finished.`,
      suggestion: `Click ${rerunLabel} whenever you are ready to generate this shot.`,
      shortSummary: 'Cancelled',
      primaryCta: { action: 'rerun', label: rerunLabel },
      noCreditsCharged: true,
      canReportToSupport: false,
      recommendSupportEscalation: false,
      technicalDetails,
    }
  }

  // 2. Session Expired / Unauthorized
  if (status === 401 || low === 'unauthorized' || low.includes('session expired')) {
    return {
      mediaType,
      category: 'session_expired',
      severity: 'warning',
      title: 'Session Expired',
      explanation: 'Your sign-in session expired before this generation could run.',
      suggestion: 'Refresh the page and sign in again to continue.',
      shortSummary: 'Session expired — refresh to sign in',
      primaryCta: { action: 'refresh_session', label: 'Refresh Page' },
      noCreditsCharged: true,
      canReportToSupport: false,
      recommendSupportEscalation: false,
      technicalDetails,
    }
  }

  // 3. Insufficient Credits
  if (
    status === 402 ||
    codeLow === 'insufficient_credits' ||
    low.includes('insufficient credits') ||
    low.includes('not enough credits')
  ) {
    return {
      mediaType,
      category: 'insufficient_credits',
      severity: 'warning',
      title: 'Insufficient Credits',
      explanation: `Your account balance does not have enough credits for this ${mediaNoun}. No credits were deducted.`,
      suggestion: 'Add credits in Settings, or switch to Draft quality for lower credit usage.',
      shortSummary: 'Insufficient credits',
      primaryCta: { action: 'top_up_credits', label: 'View Credits' },
      noCreditsCharged: true,
      canReportToSupport: true,
      recommendSupportEscalation: false,
      technicalDetails,
    }
  }

  // 4. Identity / Character Reference Safety Decline (Stills)
  if (
    code === 'IMAGE_SAFETY' ||
    (mediaType === 'still' && matchesAny(low, IDENTITY_DECLINED_MARKERS) && !low.includes('rejected for a content policy'))
  ) {
    return {
      mediaType,
      category: 'identity_declined',
      severity: 'warning',
      title: 'Character References Declined',
      explanation:
        'The AI safety filter declined the attached character reference photos for this shot. No credits were charged.',
      suggestion: 'Open Shot Director to soften the action phrasing, or switch Frames to Creative.',
      shortSummary: 'References were declined — rewrite in Director, or switch Frames to Creative',
      primaryCta: { action: 'rewrite_director', label: 'Shot Director' },
      secondaryCta: { action: 'switch_creative', label: 'Switch to Creative' },
      noCreditsCharged: true,
      canReportToSupport: true,
      recommendSupportEscalation: false,
      technicalDetails,
    }
  }

  // 5. FTV Two-Frame Interpolation Content Policy (Clips)
  const isPolicyMatch =
    code === 'CONTENT_POLICY_VIOLATION' ||
    code === 'IMAGE_CONTENT_POLICY' ||
    codeLow === 'content_policy' ||
    matchesAny(low, CONTENT_POLICY_MARKERS)

  if (
    mediaType === 'clip' &&
    isPolicyMatch &&
    (input.isFTVRelated || methodUpper === 'FTV' || low.includes('frame-to-video'))
  ) {
    const canRetryI2V = input.hasStartFrame !== false
    return {
      mediaType,
      category: 'ftv_content_policy',
      severity: 'warning',
      title: 'Two-Frame Transition Blocked',
      explanation:
        'Safety filters flagged the interpolated motion between your Start and End frames — a common false positive. No credits were charged.',
      suggestion: canRetryI2V
        ? 'Retry using only your Start Frame (Image-to-Video), or soften the prompt in Shot Director.'
        : 'Open Shot Director to rewrite for safety compliance, or switch to Creative mode.',
      shortSummary: 'Two-frame transition blocked — retry with Start Frame or Shot Director',
      primaryCta: canRetryI2V
        ? { action: 'retry_i2v', label: 'Retry with Start Frame' }
        : { action: 'rewrite_director', label: 'Rewrite for Safety' },
      secondaryCta: canRetryI2V
        ? { action: 'rewrite_director', label: 'Shot Director' }
        : { action: 'switch_creative', label: 'Switch to Creative' },
      noCreditsCharged: true,
      canReportToSupport: true,
      recommendSupportEscalation: false,
      technicalDetails,
    }
  }

  // 6. General Content Policy / Safety Filter Rejection
  if (isPolicyMatch) {
    const onCreative = providerLow === 'kling' || providerLow === 'aggregator'
    return {
      mediaType,
      category: 'content_policy',
      severity: 'warning',
      title: `${mediaTitleNoun} Blocked by Safety Filter`,
      explanation:
        'The AI safety filter flagged dramatic, medical, or intense elements in the prompt or attached references. No credits were charged.',
      suggestion: onCreative
        ? 'Use Shot Director to soften sensitive phrasing and rerun the shot.'
        : `Use Shot Director to rewrite for safety compliance, or switch ${mediaType === 'clip' ? 'Clips' : 'Frames'} to Creative.`,
      shortSummary:
        mediaType === 'still'
          ? 'Content policy — rewrite in Director, or switch Frames to Creative'
          : 'Blocked by safety filter — rewrite in Shot Director or switch to Creative',
      primaryCta: { action: 'rewrite_director', label: 'Rewrite for Safety' },
      secondaryCta: onCreative
        ? { action: 'rerun', label: rerunLabel }
        : { action: 'switch_creative', label: 'Switch to Creative' },
      noCreditsCharged: true,
      canReportToSupport: true,
      recommendSupportEscalation: false,
      technicalDetails,
    }
  }

  // 7. Character Likeness Drift
  if (
    code === 'CHARACTER_LIKENESS_MISMATCH' ||
    low.includes('character does not match reference photo')
  ) {
    return {
      mediaType,
      category: 'character_likeness',
      severity: 'warning',
      title: 'Character Likeness Drifted',
      explanation: 'The generated image did not closely match your character reference photo.',
      suggestion: 'Rerun this still for a closer match, or refine camera framing in Shot Director.',
      shortSummary: 'Character does not match reference photo — regenerate this frame',
      primaryCta: { action: 'rerun', label: rerunLabel },
      secondaryCta: { action: 'rewrite_director', label: 'Shot Director' },
      noCreditsCharged: false,
      canReportToSupport: true,
      recommendSupportEscalation: true,
      technicalDetails,
    }
  }

  // 8. Veo Clip Extension Reference Missing / Expired
  if (
    code === 'VEO_EXT_REF_REQUIRED' ||
    low.includes('extension reference expired') ||
    low.includes('extension requires the previous part')
  ) {
    return {
      mediaType,
      category: 'extension_ref_expired',
      severity: 'warning',
      title: 'Previous Clip Reference Expired',
      explanation:
        'Clip extension requires a recent upstream video reference (valid for 48 hours), which is missing or expired. No credits were charged.',
      suggestion: 'Regenerate the previous shot in the sequence first, or switch this shot to Start Frame mode.',
      shortSummary: 'Previous clip reference expired — regenerate prior shot first',
      primaryCta: { action: 'regenerate_previous', label: 'Regenerate Previous Shot' },
      secondaryCta: { action: 'rerun', label: rerunLabel },
      noCreditsCharged: true,
      canReportToSupport: true,
      recommendSupportEscalation: false,
      technicalDetails,
    }
  }

  // 9. Missing or Unreachable Reference Images
  if (
    code === 'MISSING_REFERENCE_IMAGES' ||
    low.includes('failed to download reference image') ||
    low.includes('failed to attach all reference') ||
    low.includes('reference image could not be loaded') ||
    low.includes('missing reference image')
  ) {
    return {
      mediaType,
      category: 'missing_references',
      severity: 'warning',
      title: 'Reference Image Unavailable',
      explanation:
        'One or more character, location, or prop reference images were missing or could not be loaded. No credits were charged.',
      suggestion: 'Verify your scene references in the Reference Library, then rerun this shot.',
      shortSummary: 'Reference image could not be loaded — retry this shot',
      primaryCta: { action: 'rerun', label: rerunLabel },
      secondaryCta: { action: 'open_references', label: 'Review References' },
      noCreditsCharged: true,
      canReportToSupport: true,
      recommendSupportEscalation: true,
      technicalDetails,
    }
  }

  // 10. Missing Shot Prerequisite (e.g. Dialogue Audio or Start Frame)
  if (
    code === 'DIALOGUE_AUDIO_MISSING' ||
    code === 'DIALOGUE_TOO_SHORT' ||
    low.includes('generate the start frame or shot still first') ||
    low.includes('start frame is required')
  ) {
    const isAudio = code.startsWith('DIALOGUE_') || low.includes('dialogue audio')
    return {
      mediaType,
      category: 'missing_prerequisite',
      severity: 'warning',
      title: isAudio ? 'Dialogue Audio Required' : 'Start Frame Required',
      explanation: isAudio
        ? 'This long-take mode requires generated dialogue audio of sufficient length before rendering video.'
        : 'This generation mode needs a Shot Still or Start Frame before rendering.',
      suggestion: isAudio
        ? 'Generate dialogue audio in the Audio tab first, or use standard clip generation.'
        : 'Generate the Shot Still or Start Frame in the Stills tab first, then rerun.',
      shortSummary: isAudio ? 'Generate dialogue audio first' : 'Generate start frame first',
      primaryCta: { action: 'rerun', label: rerunLabel },
      noCreditsCharged: true,
      canReportToSupport: false,
      recommendSupportEscalation: false,
      technicalDetails,
    }
  }

  // 11. Permission / Approval Gate (403)
  if (status === 403 && !matchesAny(low, PROVIDER_UNAVAILABLE_MARKERS)) {
    return {
      mediaType,
      category: 'permission_denied',
      severity: 'warning',
      title: 'Action Not Permitted',
      explanation: 'You do not have permission to generate assets on this project.',
      suggestion: 'Verify that you are signed in with the project owner or editor account.',
      shortSummary: 'Permission denied',
      primaryCta: { action: 'dismiss', label: 'Dismiss' },
      noCreditsCharged: true,
      canReportToSupport: true,
      recommendSupportEscalation: false,
      technicalDetails,
    }
  }

  // 12. Rate Limit / Quota Exhausted (429)
  if (
    status === 429 ||
    codeLow === 'quota' ||
    codeLow === 'quota_exceeded' ||
    codeLow === 'ratelimited' ||
    matchesAny(low, RATE_LIMIT_MARKERS)
  ) {
    const waitCopy = retryAfterSeconds
      ? ` Please wait about ${retryAfterSeconds}s before retrying.`
      : ' Please wait a moment before retrying.'
    return {
      mediaType,
      category: 'rate_limited',
      severity: 'warning',
      title: 'AI Service Temporarily Busy',
      explanation: `High demand temporarily rate-limited this ${mediaNoun} request.${waitCopy} No credits were charged.`,
      suggestion: `Click ${rerunLabel} in a moment, or report to Support if rate limits persist.`,
      shortSummary: 'AI service busy — wait a moment and rerun',
      primaryCta: { action: 'rerun', label: rerunLabel },
      noCreditsCharged: true,
      canReportToSupport: true,
      recommendSupportEscalation: true,
      retryAfterSeconds,
      technicalDetails,
    }
  }

  // 13. Timeout (504 / Deadline Exceeded)
  if (status === 504 || codeLow === 'upstream_timeout' || matchesAny(low, TIMEOUT_MARKERS)) {
    return {
      mediaType,
      category: 'timeout',
      severity: 'error',
      title: 'Generation Timed Out',
      explanation: `The AI provider took too long to finish rendering this ${mediaNoun}. No credits were charged.`,
      suggestion: `Click ${rerunLabel} to try again. If timeouts continue, report this to Support for escalation.`,
      shortSummary: 'Generation timed out — rerun shot',
      primaryCta: { action: 'rerun', label: rerunLabel },
      noCreditsCharged: true,
      canReportToSupport: true,
      recommendSupportEscalation: true,
      technicalDetails,
    }
  }

  // 14. Storage / Upload Failure
  if (codeLow === 'storage_failed' || matchesAny(low, STORAGE_MARKERS)) {
    return {
      mediaType,
      category: 'storage_failed',
      severity: 'error',
      title: 'Could Not Save Media',
      explanation: `The ${mediaNoun} finished rendering, but saving the file to cloud storage failed.`,
      suggestion: `Click ${rerunLabel} to try again, or report this to SceneFlow Support so we can resolve it.`,
      shortSummary: 'Could not save generated media — rerun or report',
      primaryCta: { action: 'rerun', label: rerunLabel },
      noCreditsCharged: false,
      canReportToSupport: true,
      recommendSupportEscalation: true,
      technicalDetails,
    }
  }

  // 15. Provider Unavailable / Upstream Outage / Config Issue (502, 503)
  if (
    status === 502 ||
    status === 503 ||
    code === 'AGGREGATOR_NOT_CONFIGURED' ||
    code === 'CREATIVE_KLING_UNAVAILABLE' ||
    code === 'AGGREGATOR_GENERATION_FAILED' ||
    matchesAny(low, PROVIDER_UNAVAILABLE_MARKERS)
  ) {
    return {
      mediaType,
      category: 'provider_unavailable',
      severity: 'error',
      title: 'AI Engine Temporarily Unavailable',
      explanation:
        'The generation service encountered an upstream outage or configuration issue and could not complete this shot. No credits were charged.',
      suggestion: `Click ${rerunLabel} to retry, or report this error to SceneFlow Support for immediate escalation.`,
      shortSummary: 'AI engine unavailable — rerun or report to Support',
      primaryCta: { action: 'rerun', label: rerunLabel },
      noCreditsCharged: true,
      canReportToSupport: true,
      recommendSupportEscalation: true,
      technicalDetails,
    }
  }

  // 16. Invalid Request / Parameter Mismatch (400)
  if (status === 400 || matchesAny(low, INVALID_REQUEST_MARKERS)) {
    return {
      mediaType,
      category: 'invalid_request',
      severity: 'error',
      title: 'Shot Request Rejected by Provider',
      explanation:
        'The AI engine could not process one of the settings or reference inputs for this shot. No credits were charged.',
      suggestion: `Click ${rerunLabel} to retry cleanly, or report this error to SceneFlow Support so our team can inspect and fix it.`,
      shortSummary: 'Request rejected by AI provider — rerun or report to Support',
      primaryCta: { action: 'rerun', label: rerunLabel },
      noCreditsCharged: true,
      canReportToSupport: true,
      recommendSupportEscalation: true,
      technicalDetails,
    }
  }

  // 17. Unexpected / Unknown Error
  return {
    mediaType,
    category: 'unexpected',
    severity: 'error',
    title: `${mediaTitleNoun} Generation Failed`,
    explanation: `An unexpected error interrupted this ${mediaNoun} generation before completion.`,
    suggestion: `Click ${rerunLabel} to try again. If the issue persists, report it to SceneFlow Support for fast escalation.`,
    shortSummary: `${mediaTitleNoun} generation failed — rerun or report to Support`,
    primaryCta: { action: 'rerun', label: rerunLabel },
    noCreditsCharged: true,
    canReportToSupport: true,
    recommendSupportEscalation: true,
    technicalDetails,
  }
}
