/**
 * Still generation modes for beat frames.
 *
 * Frames toolbar Standard | Creative picks the model for every still:
 * - Standard — Google Vertex
 * - Creative — Direct Kling Omni Image
 *
 * Director Safety is a prompt rewrite (Google content-policy phrasing),
 * not a generation mode. Legacy `stillPolicyMode: 'safety'` maps to Standard.
 */

export type StillGenerationMode = 'standard' | 'creative'

/** @deprecated Use StillGenerationMode. Legacy `'safety'` maps to `'standard'`. */
export type StillPolicyMode = 'safety' | 'creative' | StillGenerationMode

export const IMAGE_SAFETY_CODE = 'IMAGE_SAFETY'
export const IMAGE_CONTENT_POLICY_CODE = 'IMAGE_CONTENT_POLICY'

/** Toast / API error when Google painted the shot but declined the identity refs. */
export const IMAGE_SAFETY_USER_MESSAGE =
  'Google rendered this still without the character references. Use Director to rewrite the prompt, or switch Frames to Creative (Kling).'

export const IMAGE_SAFETY_TOAST_TITLE = 'Character references declined'

export const IMAGE_SAFETY_TOAST_DESCRIPTION =
  'Google rendered this still without the character references. Use Director to rewrite the prompt, or switch the Frames tab to Creative (Kling).'

/** Board overlay — not "generation failed". */
export const IMAGE_SAFETY_BOARD_MESSAGE =
  'References were declined — rewrite in Director, or switch Frames to Creative'

/** Toast / API error when Vertex RAI refused the still entirely. */
export const IMAGE_CONTENT_POLICY_USER_MESSAGE =
  'This generation was rejected for a content policy violation. Use Director to rewrite the prompt for Google Safety compliance, or switch Frames to Creative (Kling).'

export const IMAGE_CONTENT_POLICY_TOAST_TITLE = 'Generation rejected — content policy'

export const IMAGE_CONTENT_POLICY_TOAST_DESCRIPTION =
  'Google AI blocked this still. Use Director to rewrite the prompt for Safety compliance, or switch the Frames tab to Creative (Kling).'

export const IMAGE_CONTENT_POLICY_BOARD_MESSAGE =
  'Content policy — rewrite in Director, or switch Frames to Creative'

export const CREATIVE_KLING_UNAVAILABLE_CODE = 'CREATIVE_KLING_UNAVAILABLE'

export const CREATIVE_KLING_UNAVAILABLE_MESSAGE =
  'Creative is unavailable until Kling credentials are configured.'

export function parseStillGenerationMode(value: unknown): StillGenerationMode | undefined {
  if (value === 'creative') return 'creative'
  if (value === 'standard' || value === 'safety') return 'standard'
  return undefined
}

/** @deprecated Use parseStillGenerationMode. */
export function parseStillPolicyMode(value: unknown): StillGenerationMode | undefined {
  return parseStillGenerationMode(value)
}

export function isCreativeStillGeneration(
  mode?: StillGenerationMode | StillPolicyMode | null
): boolean {
  return mode === 'creative'
}

function errorCode(err: unknown): string | undefined {
  if (!err || typeof err !== 'object') return undefined
  const e = err as { code?: unknown; payload?: { code?: unknown } }
  if (typeof e.code === 'string') return e.code
  if (typeof e.payload?.code === 'string') return e.payload.code
  return undefined
}

function errorMessage(err: unknown): string {
  return String((err as { message?: unknown })?.message || err || '')
}

export function isImageSafetyError(err: unknown): boolean {
  if (errorCode(err) === IMAGE_SAFETY_CODE) return true

  const msg = errorMessage(err).toLowerCase()
  return (
    msg.includes('references were declined') ||
    msg.includes('without the character references')
  )
}

export function isImageContentPolicyError(err: unknown): boolean {
  if (errorCode(err) === IMAGE_CONTENT_POLICY_CODE) return true

  const msg = errorMessage(err).toLowerCase()
  return (
    msg.includes('rejected for a content policy') ||
    msg.includes('content policy — rewrite in director') ||
    msg.includes('generation rejected — content policy') ||
    msg.includes('blocked this still')
  )
}

export function isStillPolicyImageError(message: string | undefined | null): boolean {
  if (!message?.trim()) return false
  const err = new Error(message)
  return isImageSafetyError(err) || isImageContentPolicyError(err)
}

/**
 * A frame that only exists because RAI recovered, then failed likeness,
 * is the "composition-right / identity-wrong" case. Do not keep it.
 */
export function shouldRejectIgnoredIdentityStill(args: {
  policyRefusalRecovered: boolean
  stillPolicyMode?: StillPolicyMode | StillGenerationMode
  hasIdentityRefs: boolean
  likenessFailed: boolean
}): boolean {
  if (!args.hasIdentityRefs || !args.likenessFailed) return false
  return args.policyRefusalRecovered
}

/** Vertex still ladder: first try + one rewritten pro. Generation mode does not change the count. */
export function resolveVertexStillPolicyAttempts(
  _mode?: StillPolicyMode | StillGenerationMode
): number {
  return 2
}

export function stillPolicyBoardMessage(err: unknown): string {
  if (isImageContentPolicyError(err)) return IMAGE_CONTENT_POLICY_BOARD_MESSAGE
  if (isImageSafetyError(err)) return IMAGE_SAFETY_BOARD_MESSAGE
  return IMAGE_CONTENT_POLICY_BOARD_MESSAGE
}

export function stillPolicyUserMessage(err: unknown): string {
  if (isImageContentPolicyError(err)) return IMAGE_CONTENT_POLICY_USER_MESSAGE
  if (isImageSafetyError(err)) return IMAGE_SAFETY_USER_MESSAGE
  return IMAGE_CONTENT_POLICY_USER_MESSAGE
}
