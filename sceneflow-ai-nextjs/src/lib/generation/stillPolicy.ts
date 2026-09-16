/**
 * Still-policy modes for beat frames.
 *
 * Automatic Frame Agent / Express never calls Kling. It exhausts Google
 * (flash, then one rewritten pro attempt) and fails visibly with IMAGE_SAFETY
 * when the still is empty or the identity refs were ignored.
 *
 * Director then chooses:
 * - Safety — rewritten still on Vertex so RAI will lock the same refs
 * - Creative — original composed still on Direct Kling Omni Image
 */

export type StillPolicyMode = 'safety' | 'creative'

export const IMAGE_SAFETY_CODE = 'IMAGE_SAFETY'

/** Toast / API error when Google painted the shot but declined the identity refs. */
export const IMAGE_SAFETY_USER_MESSAGE =
  'Google rendered this still without the character references. Open Director to retry as Safety or Creative.'

/** Board overlay — not "generation failed". */
export const IMAGE_SAFETY_BOARD_MESSAGE =
  'References were declined — retry as Safety or Creative in Director'

export const CREATIVE_KLING_UNAVAILABLE_CODE = 'CREATIVE_KLING_UNAVAILABLE'

export const CREATIVE_KLING_UNAVAILABLE_MESSAGE =
  'Creative is unavailable until Kling credentials are configured.'

export function parseStillPolicyMode(value: unknown): StillPolicyMode | undefined {
  if (value === 'safety' || value === 'creative') return value
  return undefined
}

export function isImageSafetyError(err: unknown): boolean {
  if (err && typeof err === 'object') {
    const e = err as { status?: unknown; code?: unknown; payload?: { code?: unknown } }
    if (e.code === IMAGE_SAFETY_CODE) return true
    if (e.payload?.code === IMAGE_SAFETY_CODE) return true
  }

  const msg = String((err as { message?: unknown })?.message || err || '').toLowerCase()
  return (
    msg.includes('references were declined') ||
    msg.includes('without the character references')
  )
}

export function isStillPolicyImageError(message: string | undefined | null): boolean {
  if (!message?.trim()) return false
  return isImageSafetyError(new Error(message))
}

/**
 * A frame that only exists because RAI recovered, then failed likeness,
 * is the "composition-right / identity-wrong" case. Do not keep it.
 *
 * Director Safety pre-softens the prompt the same way and can produce the
 * same drift without setting `policyRefusalRecovered`, so Safety runs are
 * rejected here too when likeness confirms the wrong person.
 */
export function shouldRejectIgnoredIdentityStill(args: {
  policyRefusalRecovered: boolean
  stillPolicyMode?: StillPolicyMode
  hasIdentityRefs: boolean
  likenessFailed: boolean
}): boolean {
  if (!args.hasIdentityRefs || !args.likenessFailed) return false
  return args.policyRefusalRecovered || args.stillPolicyMode === 'safety'
}

/** Safety pre-rewrites then retries at escalation level 2; auto exhausts first try + one rewritten pro. */
export function resolveVertexStillPolicyAttempts(mode?: StillPolicyMode): number {
  if (mode === 'safety') return 2
  return 2
}
