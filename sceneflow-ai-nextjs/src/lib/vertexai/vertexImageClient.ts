/**
 * Vertex AI image generation (production media path).
 *
 * All Imagen endpoints were retired 2026-06-30, so every image request — with or
 * without reference images — goes through Gemini Image on Vertex (generateContent).
 */

import { getVertexAIAuthToken } from '@/lib/vertexai/client'
import { fetchReferenceImageAsBase64 } from '@/lib/storage/fetchReferenceImage'
import { escalateImagePromptForRetry } from '@/lib/generation/imagePolicyEscalation'
import { GEMINI_IMAGE_MODELS } from '@/lib/config/modelConfig'
import { priorityPaygoHeaders } from '@/lib/vertexai/priorityPaygo'
import { runInVertexImageGate } from '@/lib/vertexai/vertexImageGate'
import { getGeminiImageSafetySettings } from '@/lib/vertexai/safety'
import { MAX_REFERENCE_IMAGES_ECO } from '@/lib/vision/referenceLimits'

export type VertexImageTier = 'eco' | 'designer' | 'director'
export type VertexThinkingLevel = 'low' | 'high'

const GEMINI_IMAGE_TIER_CONFIG = {
  eco: { model: GEMINI_IMAGE_MODELS.flash, maxResolution: '2K' },
  designer: { model: GEMINI_IMAGE_MODELS.pro, maxResolution: '4K' },
  director: { model: GEMINI_IMAGE_MODELS.pro, maxResolution: '4K' },
} as const

let proModelRateLimitedUntil: number | null = null
const RATE_LIMIT_COOLDOWN_MS = 60_000
const MAX_RETRIES = 3
const INITIAL_RETRY_DELAY_MS = 2000
const MAX_RETRY_DELAY_MS = 10_000
/**
 * 429 ladder for Flash and identity-ref Pro. Generic 2s/4s/8s burned ~45s of
 * short retries on flash then failed (production 2026-09-11 draft beats).
 */
const RATE_LIMIT_RETRY_DELAYS_MS = [5_000, 15_000, 30_000] as const
const REQUEST_TIMEOUT_MS = 90_000
/** Below this there is no point issuing the request at all. */
const MIN_REQUEST_TIMEOUT_MS = 10_000

/** Marker so scene route does not re-burst another full outer×inner 429 ladder. */
export const IDENTITY_REF_RATE_LIMIT_EXHAUSTED =
  'identity-ref rate limit exhausted'

/**
 * Marker for a 429 surrendered on the first attempt rather than slept through.
 * Distinct from the exhausted ladder above: the beat is stamped failed so
 * sibling frames can finish; the user regenerates this still later.
 */
export const RATE_LIMIT_FAILED_FAST = 'rate limit failed fast'

/** Marker for a caller-supplied budget running out mid-ladder. */
export const IMAGE_DEADLINE_EXCEEDED = 'image generation deadline exceeded'

function deadlinePassed(deadlineAt?: number): boolean {
  return deadlineAt != null && Date.now() >= deadlineAt
}

/**
 * Per-attempt timeout, shortened to land inside the caller's deadline. Without
 * this the client's own 90s timeout plus its retry ladder can outlast the
 * serverless function that is waiting on it.
 */
function requestTimeoutFor(deadlineAt?: number): number {
  if (deadlineAt == null) return REQUEST_TIMEOUT_MS
  const remaining = deadlineAt - Date.now()
  return Math.min(REQUEST_TIMEOUT_MS, Math.max(MIN_REQUEST_TIMEOUT_MS, remaining))
}

function referenceCountExceedsEcoCap(referenceImages?: VertexReferenceImage[]): boolean {
  return (referenceImages?.length ?? 0) > MAX_REFERENCE_IMAGES_ECO
}

function hasIdentityReferenceImages(options: GenerateVertexImageOptions): boolean {
  return (options.referenceImages?.length ?? 0) > 0
}

function canFallbackToEcoTier(options: GenerateVertexImageOptions): boolean {
  // Express fail-fast: stay on the requested tier. A salvage frame from eco
  // (or a later pro retry) is the result the user would regenerate anyway.
  if (options.failFastOnRateLimit) return false
  // Identity / wardrobe lock jobs must stay on the pro image model. A warm-instance
  // 429 cooldown previously forced flash, which then rate-limited and still hit
  // IMAGE_SAFETY (production 2026-08-07 Scene Headshot logs).
  if (hasIdentityReferenceImages(options)) return false
  return !referenceCountExceedsEcoCap(options.referenceImages)
}

/**
 * One pro retry when flash refuses an identity-ref frame.
 *
 * `canFallbackToEcoTier` refuses the reverse move because flash both rate-limited
 * and hit IMAGE_SAFETY on identity work (production 2026-08-07). Animatic beats
 * request eco explicitly, which bypasses that guard, so the protection has to be
 * restored from this side: a refusal costs one pro attempt, not the frame.
 *
 * The escalated attempt carries a softened prompt. Re-sending the refused
 * wording verbatim produced a rendered frame that ignored its identity
 * references — pro kept the composition and put an invented face in it, which
 * likeness validation then scored at 30% (production 2026-09-12 beat frames).
 * A caller cannot tell that apart from ordinary drift, so the result is flagged.
 */
function escalateEcoRefusalToPro(
  model: string,
  options: GenerateVertexImageOptions,
  reason: string
): Promise<VertexImageResult> | null {
  if (
    !model.includes('flash-image') ||
    !hasIdentityReferenceImages(options) ||
    options.escalatedFromEcoTier ||
    deadlinePassed(options.deadlineAt)
  ) {
    return null
  }
  console.warn(
    `[Vertex Gemini Image] ${model} returned no image for an identity-ref frame (${reason}); escalating to ${GEMINI_IMAGE_TIER_CONFIG.designer.model}`
  )
  const softenedPrompt = escalateImagePromptForRetry(options.prompt, 1, {
    skipProductionStillFraming: options.skipProductionStillFraming,
  })
  if (softenedPrompt !== options.prompt) {
    console.warn(
      '[Vertex Gemini Image] Softened the refused action language before the pro attempt — an unchanged prompt returns a frame that ignores the identity references'
    )
  }
  return generateVertexGeminiImage(
    {
      ...options,
      prompt: softenedPrompt,
      modelTier: 'designer',
      escalatedFromEcoTier: true,
    },
    0
  ).then((result) => ({ ...result, policyRefusalRecovered: true }))
}

async function sleepWithBackoff(attempt: number): Promise<void> {
  const delay = Math.min(INITIAL_RETRY_DELAY_MS * 2 ** attempt, MAX_RETRY_DELAY_MS)
  const jitter = Math.random() * 500
  await new Promise((r) => setTimeout(r, delay + jitter))
}

function parseRetryAfterMs(response: Response): number | null {
  const raw = response.headers.get('retry-after')
  if (!raw?.trim()) return null
  const asSeconds = Number(raw)
  if (Number.isFinite(asSeconds) && asSeconds >= 0) {
    return Math.min(60_000, Math.max(1_000, asSeconds * 1000))
  }
  const asDate = Date.parse(raw)
  if (Number.isFinite(asDate)) {
    const delta = asDate - Date.now()
    if (delta > 0) return Math.min(60_000, Math.max(1_000, delta))
  }
  return null
}

async function sleepRateLimitBackoff(
  attempt: number,
  response?: Response
): Promise<void> {
  const retryAfter = response ? parseRetryAfterMs(response) : null
  const scheduled =
    RATE_LIMIT_RETRY_DELAYS_MS[
      Math.min(attempt, RATE_LIMIT_RETRY_DELAYS_MS.length - 1)
    ] ?? 30_000
  const delay = retryAfter != null ? Math.max(retryAfter, scheduled) : scheduled
  const jitter = Math.random() * 750
  await new Promise((r) => setTimeout(r, delay + jitter))
}

function getVertexImageConfig() {
  const projectId = process.env.VERTEX_PROJECT_ID || process.env.GCP_PROJECT_ID
  // Only the image-specific variable pins a region. VERTEX_LOCATION is set for
  // text and Cloud SQL on every deployment, so treating it as a pin would keep
  // image traffic regional everywhere and defeat the global default below.
  const pinnedLocation = process.env.VERTEX_IMAGE_LOCATION?.trim()
  const location =
    pinnedLocation ||
    process.env.VERTEX_LOCATION ||
    process.env.GCP_REGION ||
    'us-central1'
  if (!projectId) {
    throw new Error('VERTEX_PROJECT_ID or GCP_PROJECT_ID must be configured for image generation')
  }
  return { projectId, location, regionPinned: Boolean(pinnedLocation) }
}

/**
 * Resolve Vertex location + endpoint for Gemini image models.
 *
 * Global is the default for every Gemini image model, not just Gemini 3.
 * A 429 here is Dynamic Shared Quota contention rather than a project limit,
 * and the global endpoint answers it by routing each request to whichever
 * region currently has capacity — Google's documented first remedy. Pinning
 * `VERTEX_IMAGE_LOCATION` opts back into one region for data residency, which
 * Gemini 3 image models cannot honor because they are global-only.
 */
export function resolveVertexGeminiImageEndpoint(args: {
  model: string
  projectId: string
  regionalLocation: string
  regionPinned?: boolean
}): { endpoint: string; effectiveLocation: string; apiVersion: string } {
  const isGemini3 = args.model.includes('gemini-3')
  const effectiveLocation =
    isGemini3 || !args.regionPinned ? 'global' : args.regionalLocation
  const isPreview = args.model.includes('preview')
  const apiVersion = isPreview ? 'v1beta1' : 'v1'
  const baseUrl =
    effectiveLocation === 'global'
      ? 'https://aiplatform.googleapis.com'
      : `https://${effectiveLocation}-aiplatform.googleapis.com`
  const endpoint = `${baseUrl}/${apiVersion}/projects/${args.projectId}/locations/${effectiveLocation}/publishers/google/models/${args.model}:generateContent`
  return { endpoint, effectiveLocation, apiVersion }
}

export interface VertexReferenceImage {
  imageUrl?: string
  base64Image?: string
  mimeType?: string
  name?: string
}

export interface GenerateVertexImageOptions {
  prompt: string
  aspectRatio?: '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9' | '21:9'
  imageSize?: '1K' | '2K' | '4K'
  referenceImages?: VertexReferenceImage[]
  modelTier?: VertexImageTier
  thinkingLevel?: VertexThinkingLevel
  negativePrompt?: string
  /**
   * Express fail-fast: one Vertex attempt, then throw.
   *
   * Skips the 429 sleep ladder, timeout/503 inner retries, and eco↔pro
   * fallback. IMAGE_SAFETY still escalates flash→rewritten pro so Express
   * exhausts Google before failing the frame.
   */
  failFastOnRateLimit?: boolean
  /** Internal: this call is already the pro retry of a refused eco request. */
  escalatedFromEcoTier?: boolean
  /** Throw if any requested reference image fails to download instead of silently dropping it. */
  requireAllReferenceImages?: boolean
  /** Policy ladder attempts (used by vertexImageWithKlingFallback). */
  policyMaxAttempts?: number
  /** Un-escalated prompt for policy retries (Safety passes the pre-rewritten prompt separately). */
  policyBasePrompt?: string
  /** Escalation steps already applied to `prompt` before the policy ladder (Safety: 1). */
  policyEscalationOffset?: number
  /** Skip wardrobe “production still” framing on policy retries (scene/beat frames). */
  skipProductionStillFraming?: boolean
  /** Shot scale so a structured still can reassemble TASK occupancy after a policy rewrite. */
  shotType?: string
  allowTypography?: boolean
  /**
   * Absolute epoch-ms cutoff covering this call and every retry it makes.
   * Attempts are shortened to fit it and no further attempt starts past it.
   */
  deadlineAt?: number
}

export interface VertexImageResult {
  imageBase64: string
  mimeType: string
  text?: string
  provider: 'vertex'
  modelId: string
  /**
   * This frame only exists because a refusal was recovered from: the eco model
   * declined the request on content policy and the pro attempt carried softened
   * wording. A refused frame is also the frame most likely to come back with the
   * identity references ignored, so callers use this to decide what to escalate.
   */
  policyRefusalRecovered?: boolean
}

/** Flash keeps labeled images-first. Pro sends unlabeled HIGH images, then the prompt. */
export type VertexImageReferenceLayout = 'flash' | 'pro'

export const PRO_REFERENCE_MEDIA_RESOLUTION_LEVEL = 'MEDIA_RESOLUTION_HIGH' as const

export type VertexTextPart = { text: string }

export type VertexInlineImagePart = {
  inlineData: { mimeType: string; data: string }
  mediaResolution?: { level: typeof PRO_REFERENCE_MEDIA_RESOLUTION_LEVEL }
}

export type VertexMultimodalPart = VertexTextPart | VertexInlineImagePart

export type VertexResponsePart = {
  text?: string
  thought?: boolean
  inlineData?: { data?: string; mimeType?: string }
  inline_data?: { data?: string; mime_type?: string }
}

export function usesProImageReferenceLayout(model: string): boolean {
  return model.includes('pro-image')
}

export function effectiveImageSizeForModel(
  model: string,
  imageSize?: '1K' | '2K' | '4K'
): '1K' | '2K' | '4K' | undefined {
  return model.includes('flash-image') ? undefined : imageSize
}

type AttachedReferenceImage = { mimeType: string; data: string; name?: string }

async function resolveAttachedReferenceImages(
  referenceImages: VertexReferenceImage[],
  requireAllReferenceImages?: boolean
): Promise<AttachedReferenceImage[]> {
  const attached: AttachedReferenceImage[] = []

  for (const ref of referenceImages) {
    let base64Data = ref.base64Image
    let mimeType = ref.mimeType || 'image/jpeg'

    if (!base64Data && ref.imageUrl) {
      const downloaded = await fetchReferenceImageAsBase64(ref.imageUrl, { label: ref.name })
      base64Data = downloaded.base64
      mimeType = downloaded.mimeType
    }

    if (!base64Data) {
      const label = ref.name || ref.imageUrl || 'unnamed reference'
      if (requireAllReferenceImages) {
        throw new Error(`Failed to download reference image: ${label}`)
      }
      console.warn(`[Vertex Gemini Image] Skipping reference that failed to download: ${label}`)
      continue
    }
    if (base64Data.includes(',')) base64Data = base64Data.split(',')[1] || base64Data
    attached.push({ mimeType, data: base64Data, name: ref.name })
  }

  console.log(
    `[Vertex Gemini Image] Attached ${attached.length}/${referenceImages.length} reference image(s)`
  )
  if (requireAllReferenceImages && attached.length < referenceImages.length) {
    throw new Error(
      `Failed to attach all reference images (${attached.length}/${referenceImages.length})`
    )
  }

  return attached
}

/**
 * Flash: labeled images lead, instruction text follows. Prompt-first caused
 * Flash to commit to a subject before it had seen the identity (right
 * composition, wrong person).
 *
 * Pro: consecutive unlabeled images at MEDIA_RESOLUTION_HIGH, then the prompt.
 * Prompt-first plus a complete still script let thinking illustrate the novel
 * without the photos. Do not interleave `[label]` text parts.
 */
export async function buildMultimodalParts(
  fullPrompt: string,
  referenceImages?: VertexReferenceImage[],
  requireAllReferenceImages?: boolean,
  layout: VertexImageReferenceLayout = 'flash'
): Promise<VertexMultimodalPart[]> {
  if (!referenceImages?.length) return [{ text: fullPrompt }]

  const attached = await resolveAttachedReferenceImages(
    referenceImages,
    requireAllReferenceImages
  )

  if (layout === 'pro') {
    const parts: VertexMultimodalPart[] = []
    for (const ref of attached) {
      parts.push({
        inlineData: { mimeType: ref.mimeType, data: ref.data },
        mediaResolution: { level: PRO_REFERENCE_MEDIA_RESOLUTION_LEVEL },
      })
    }
    parts.push({ text: fullPrompt })
    return parts
  }

  const parts: VertexMultimodalPart[] = []
  for (const ref of attached) {
    parts.push({ text: ref.name ? `[${ref.name}]\n` : '' })
    parts.push({ inlineData: { mimeType: ref.mimeType, data: ref.data } })
  }
  parts.push({ text: fullPrompt })
  return parts
}

/**
 * Prefer the last non-thought image. Pro thinking can emit interim composition
 * tests; Google's last thought image is the final render only when no later
 * non-thought image exists.
 */
export function pickGeneratedImageFromParts(parts: VertexResponsePart[]): {
  imageBase64?: string
  mimeType: string
  text?: string
} {
  let lastAny: { data: string; mimeType: string } | undefined
  let lastNonThought: { data: string; mimeType: string } | undefined
  let text: string | undefined

  for (const part of parts) {
    const inline = part.inlineData || part.inline_data
    if (inline?.data) {
      const image = {
        data: inline.data,
        mimeType: inline.mimeType || inline.mime_type || 'image/png',
      }
      lastAny = image
      if (!part.thought) lastNonThought = image
    } else if (part.text && !part.thought) {
      text = part.text
    }
  }

  const picked = lastNonThought ?? lastAny
  return {
    imageBase64: picked?.data,
    mimeType: picked?.mimeType ?? 'image/png',
    text,
  }
}

export function countPromptImageTokens(usageMetadata: unknown): number | null {
  if (!usageMetadata || typeof usageMetadata !== 'object') return null
  const meta = usageMetadata as Record<string, unknown>
  const details = meta.promptTokensDetails ?? meta.prompt_tokens_details
  if (!Array.isArray(details)) return null

  let total = 0
  let found = false
  for (const entry of details) {
    if (!entry || typeof entry !== 'object') continue
    const rec = entry as Record<string, unknown>
    const modality = String(rec.modality ?? '').toUpperCase()
    if (modality !== 'IMAGE') continue
    const count = Number(rec.tokenCount ?? rec.token_count)
    if (!Number.isFinite(count)) continue
    found = true
    total += count
  }
  return found ? total : null
}

function logPromptImageTokenUsage(
  usageMetadata: unknown,
  model: string,
  referenceCount: number
): void {
  if (referenceCount <= 0) return
  const imageTokens = countPromptImageTokens(usageMetadata)
  if (imageTokens == null) {
    console.log(
      `[Vertex Gemini Image] usageMetadata has no IMAGE promptTokensDetails (refs=${referenceCount}, model=${model})`
    )
    return
  }
  console.log(
    `[Vertex Gemini Image] Prompt IMAGE tokens: ${imageTokens} (refs=${referenceCount}, model=${model})`
  )
  if (imageTokens === 0) {
    console.warn(
      `[Vertex Gemini Image] 0 IMAGE tokens with ${referenceCount} reference(s) attached — Vertex dropped the parts`
    )
  }
}

/**
 * Gemini Image on Vertex (multimodal generateContent).
 */
export async function generateVertexGeminiImage(
  options: GenerateVertexImageOptions,
  retryCount = 0
): Promise<VertexImageResult> {
  if (deadlinePassed(options.deadlineAt)) {
    throw new Error(`Vertex Gemini Image error: ${IMAGE_DEADLINE_EXCEEDED}`)
  }
  const tier = options.modelTier || 'designer'
  const useFlashFallback =
    tier !== 'eco' &&
    canFallbackToEcoTier(options) &&
    proModelRateLimitedUntil != null &&
    Date.now() < proModelRateLimitedUntil

  let model: string
  if (tier === 'eco' || useFlashFallback) {
    model = GEMINI_IMAGE_TIER_CONFIG.eco.model
  } else {
    model =
      process.env.VERTEX_GEMINI_IMAGE_PRO_MODEL || GEMINI_IMAGE_TIER_CONFIG.designer.model
  }

  const { projectId, location, regionPinned } = getVertexImageConfig()
  const { endpoint, effectiveLocation } = resolveVertexGeminiImageEndpoint({
    model,
    projectId,
    regionalLocation: location,
    regionPinned,
  })

  if (retryCount === 0) {
    console.log(
      `[Vertex Gemini Image] Generating (tier=${tier}, model=${model}, refs=${options.referenceImages?.length ?? 0}, aspect=${options.aspectRatio ?? 'unset'})`
    )
  }

  if (effectiveLocation === 'global') {
    console.log(
      `[Vertex Gemini Image] Using global endpoint for ${model} (routes to the region with spare capacity)`
    )
  } else {
    console.log(
      `[Vertex Gemini Image] Using pinned region ${effectiveLocation} for ${model} (VERTEX_IMAGE_LOCATION set)`
    )
  }

  let fullPrompt = options.prompt
  if (options.negativePrompt) {
    fullPrompt += `\n\nAVOID the following in the generated image: ${options.negativePrompt}`
  }

  const parts = await buildMultimodalParts(
    fullPrompt,
    options.referenceImages,
    options.requireAllReferenceImages,
    usesProImageReferenceLayout(model) ? 'pro' : 'flash'
  )
  const effectiveImageSize = effectiveImageSizeForModel(model, options.imageSize)

  const requestBody = {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
      ...(options.aspectRatio || effectiveImageSize
        ? {
            imageConfig: {
              ...(options.aspectRatio && { aspectRatio: options.aspectRatio }),
              ...(effectiveImageSize && { imageSize: effectiveImageSize }),
            },
          }
        : {}),
    },
    safetySettings: getGeminiImageSafetySettings(),
  }

  const accessToken = await getVertexAIAuthToken()
  const controller = new AbortController()
  const requestTimeoutMs = requestTimeoutFor(options.deadlineAt)
  const timeoutId = setTimeout(() => controller.abort(), requestTimeoutMs)

  let response: Response
  try {
    // The gate holds the dispatch and nothing else. Every backoff and retry
    // below re-enters this function, so a slot spanning them would be waited
    // on by the call holding it — and a frame sleeping out a 429 is not
    // generating anyway, so it must not hold capacity a ready frame could use.
    response = await runInVertexImageGate(() =>
      fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          ...priorityPaygoHeaders(),
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      })
    )
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      if (model.includes('pro-image') && canFallbackToEcoTier(options)) {
        console.warn(
          `[Vertex Gemini Image] ${model} timed out after ${requestTimeoutMs}ms, falling back to ${GEMINI_IMAGE_TIER_CONFIG.eco.model}`
        )
        proModelRateLimitedUntil = Date.now() + RATE_LIMIT_COOLDOWN_MS
        return generateVertexGeminiImage({ ...options, modelTier: 'eco' }, 0)
      }
      if (model.includes('pro-image') && referenceCountExceedsEcoCap(options.referenceImages)) {
        console.warn(
          `[Vertex Gemini Image] ${model} timed out with ${options.referenceImages?.length ?? 0} refs (exceeds eco cap ${MAX_REFERENCE_IMAGES_ECO}); retrying pro model`
        )
      }
      if (
        !options.failFastOnRateLimit &&
        retryCount < MAX_RETRIES &&
        !deadlinePassed(options.deadlineAt)
      ) {
        await sleepWithBackoff(retryCount)
        return generateVertexGeminiImage(options, retryCount + 1)
      }
    }
    throw error
  }
  clearTimeout(timeoutId)

  if (!response.ok) {
    const errorText = await response.text()
    if (response.status === 429 && options.failFastOnRateLimit) {
      // Every sleep below is served while still holding the caller's image-lane
      // slot, which on a 2-wide lane parks half the run on a frame that is
      // doing nothing. Hand the slot back now; Frame Agent stamps the error
      // and continues sibling beats instead of waiting to retry.
      console.warn(
        `[Vertex Gemini Image] Rate limit on ${model} — failing fast without eco fallback so the lane frees immediately`
      )
      throw new Error(
        `Vertex Gemini Image error ${response.status}: ${
          hasIdentityReferenceImages(options)
            ? IDENTITY_REF_RATE_LIMIT_EXHAUSTED
            : RATE_LIMIT_FAILED_FAST
        } after ${retryCount + 1} attempt(s): ${errorText}`
      )
    }
    if (response.status === 429 && model.includes('pro-image')) {
      if (hasIdentityReferenceImages(options)) {
        const allowIdentityRefRetry =
          retryCount < MAX_RETRIES && !deadlinePassed(options.deadlineAt)
        if (allowIdentityRefRetry) {
          console.warn(
            `[Vertex Gemini Image] Rate limit on ${model} with reference images (attempt ${retryCount + 1}/${MAX_RETRIES}) — backing off without eco fallback`
          )
          await sleepRateLimitBackoff(retryCount, response)
          return generateVertexGeminiImage(options, retryCount + 1)
        }
        console.warn(
          `[Vertex Gemini Image] Rate limit on ${model} with reference images — failing fast without eco fallback`
        )
        throw new Error(
          `Vertex Gemini Image error ${response.status}: ${IDENTITY_REF_RATE_LIMIT_EXHAUSTED} after ${retryCount + 1} attempt(s): ${errorText}`
        )
      }
      if (!useFlashFallback) {
        proModelRateLimitedUntil = Date.now() + RATE_LIMIT_COOLDOWN_MS
        return generateVertexGeminiImage(options, 0)
      }
    }
    if (response.status === 429 && retryCount < MAX_RETRIES && !deadlinePassed(options.deadlineAt)) {
      console.warn(
        `[Vertex Gemini Image] Rate limit on ${model} (attempt ${retryCount + 1}/${MAX_RETRIES}). Backing off...`
      )
      if (model.includes('flash-image')) {
        await sleepRateLimitBackoff(retryCount, response)
      } else {
        await sleepWithBackoff(retryCount)
      }
      return generateVertexGeminiImage(options, retryCount + 1)
    }
    // Pro preview models require allowlist access; fall back to GA flash-image model
    if (
      response.status === 404 &&
      model !== GEMINI_IMAGE_TIER_CONFIG.eco.model &&
      (errorText.includes('NOT_FOUND') || errorText.includes('not found')) &&
      canFallbackToEcoTier(options)
    ) {
      console.warn(
        `[Vertex Gemini Image] Model ${model} unavailable (404), falling back to ${GEMINI_IMAGE_TIER_CONFIG.eco.model}`
      )
      return generateVertexGeminiImage({ ...options, modelTier: 'eco' }, 0)
    }
    if (
      response.status === 404 &&
      model.includes('pro-image') &&
      referenceCountExceedsEcoCap(options.referenceImages)
    ) {
      console.warn(
        `[Vertex Gemini Image] Model ${model} unavailable (404) with ${options.referenceImages?.length ?? 0} refs; cannot fall back to eco (cap ${MAX_REFERENCE_IMAGES_ECO})`
      )
    }
    if (
      response.status === 503 &&
      !options.failFastOnRateLimit &&
      retryCount < MAX_RETRIES &&
      !deadlinePassed(options.deadlineAt)
    ) {
      await sleepWithBackoff(retryCount)
      return generateVertexGeminiImage(options, retryCount + 1)
    }
    throw new Error(`Vertex Gemini Image error ${response.status}: ${errorText}`)
  }

  if (model.includes('pro-image')) proModelRateLimitedUntil = null

  const data = await response.json()
  logPromptImageTokenUsage(
    data.usageMetadata ?? data.usage_metadata,
    model,
    options.referenceImages?.length ?? 0
  )
  if (data.promptFeedback?.blockReason) {
    const escalated = escalateEcoRefusalToPro(
      model,
      options,
      `blockReason=${data.promptFeedback.blockReason}`
    )
    if (escalated) return escalated
    throw new Error(
      `Image generation blocked by safety: ${data.promptFeedback.blockReason}`
    )
  }

  const candidates = data.candidates
  if (!candidates?.length) {
    const block = data.promptFeedback?.blockReason
    const escalated = escalateEcoRefusalToPro(model, options, 'empty candidates')
    if (escalated) return escalated
    throw new Error(
      block
        ? `Image generation blocked by safety: ${block}`
        : 'No image generated from Vertex Gemini Image (blocked by safety or empty candidates)'
    )
  }

  const candidate = candidates[0]
  const picked = pickGeneratedImageFromParts(candidate.content?.parts || [])
  const imageBase64 = picked.imageBase64
  const imageMimeType = picked.mimeType
  const responseText = picked.text

  if (!imageBase64) {
    const finishReason = String(
      candidate.finishReason || candidate.finish_reason || 'unknown'
    )
    const textSnippet = (responseText || '').slice(0, 200)
    const detail = `model=${model}, finishReason=${finishReason}${
      textSnippet ? `, text=${JSON.stringify(textSnippet)}` : ''
    }`
    const escalated = escalateEcoRefusalToPro(model, options, `finishReason=${finishReason}`)
    if (escalated) return escalated
    // Soft refusals (text-only 200 / SAFETY finish) — mark as safety so sanitize retries run.
    throw new Error(
      `No image in Vertex Gemini Image response — blocked by safety (${detail})`
    )
  }

  return {
    imageBase64,
    mimeType: imageMimeType,
    text: responseText,
    provider: 'vertex',
    modelId: model,
  }
}

/**
 * Unified Vertex image entry. Text-only and reference-based generation both use
 * Gemini Image; the Imagen `:predict` path was removed after the 2026-06-30 retirement.
 */
export async function generateVertexImage(
  options: GenerateVertexImageOptions
): Promise<VertexImageResult> {
  return generateVertexGeminiImage(options)
}

export interface VertexImageEditOptions {
  sourceImage: string
  instruction: string
  referenceImage?: string
  referenceImages?: Array<{ imageUrl: string; name?: string }>
  aspectRatio?: GenerateVertexImageOptions['aspectRatio']
  imageSize?: '1K' | '2K'
  editIntent?: 'default' | 'keyframeEnd' | 'preVisEdit'
  segmentDurationSeconds?: number
  modelTier?: VertexImageTier
  thinkingLevel?: VertexThinkingLevel
  negativePrompt?: string
  /** Appended when identity + wardrobe refs are both sent. */
  dualReferenceInstruction?: string
}

export async function editVertexImage(options: VertexImageEditOptions): Promise<VertexImageResult> {
  const intent = options.editIntent ?? 'default'
  const dur =
    typeof options.segmentDurationSeconds === 'number' &&
    Number.isFinite(options.segmentDurationSeconds)
      ? options.segmentDurationSeconds
      : undefined

  let editPrompt: string
  if (intent === 'keyframeEnd') {
    const durLine =
      dur != null && dur > 0
        ? `END keyframe of a ~${dur}s clip. Primary image is the START frame.`
        : `END keyframe. Primary image is the START frame.`
    editPrompt = `${durLine}\n\nDIRECTED EDIT:\n${options.instruction}\n\nPreserve scene, cast, and lighting continuity.`
  } else if (intent === 'preVisEdit') {
    editPrompt =
      `PRE-VIS STORYBOARD EDIT:\n${options.instruction}\n\n` +
      'Apply a minimal, localized change only. Preserve exact composition, framing, aspect ratio, character identities, and overall scene layout unless the instruction explicitly requires otherwise.'
    if (options.dualReferenceInstruction?.trim()) {
      editPrompt += `\n\n${options.dualReferenceInstruction.trim()}`
    }
  } else {
    editPrompt = `Edit this image: ${options.instruction}\nPreserve identity, framing, and lighting unless the edit requires otherwise.`
  }

  const referenceImages: VertexReferenceImage[] = []

  if (options.sourceImage.startsWith('data:')) {
    const m = options.sourceImage.match(/^data:([^;]+);base64,(.+)$/)
    if (m) referenceImages.push({ base64Image: m[2], mimeType: m[1], name: 'source-to-edit' })
  } else {
    referenceImages.push({ imageUrl: options.sourceImage, name: 'source-to-edit' })
  }

  if (options.referenceImage) {
    if (options.referenceImage.startsWith('data:')) {
      const m = options.referenceImage.match(/^data:([^;]+);base64,(.+)$/)
      if (m) referenceImages.push({ base64Image: m[2], mimeType: m[1], name: 'identity-reference' })
    } else {
      referenceImages.push({ imageUrl: options.referenceImage, name: 'identity-reference' })
    }
  }

  for (const ref of options.referenceImages ?? []) {
    if (!ref.imageUrl?.trim()) continue
    const url = ref.imageUrl.trim()
    if (url.startsWith('data:')) {
      const m = url.match(/^data:([^;]+);base64,(.+)$/)
      if (m) {
        referenceImages.push({
          base64Image: m[2],
          mimeType: m[1],
          name: ref.name || 'reference',
        })
      }
    } else {
      referenceImages.push({ imageUrl: url, name: ref.name || 'reference' })
    }
  }

  return generateVertexGeminiImage({
    prompt: editPrompt,
    aspectRatio: options.aspectRatio || '1:1',
    imageSize: options.imageSize || '1K',
    referenceImages,
    modelTier: options.modelTier,
    thinkingLevel: options.thinkingLevel,
    negativePrompt: options.negativePrompt,
  })
}
