/**
 * Which Gemini image model backs draft beat frames.
 *
 * Draft beats are storyboard coverage, not delivery frames. Flash is faster and
 * sits on a separate, larger quota than `gemini-3-pro-image`, whose ceiling was
 * failing beats outright even at image-lane concurrency 1.
 *
 * Eligibility is read off the resolved tier, so every caller that asks for a
 * draft beat gets the draft model. It used to hang on an `animaticDraft` flag
 * that only the Express orchestrator sent, which meant the prompt builder's
 * "Draft" button and the per-beat regen silently ran on pro — 47s and the pro
 * quota for a frame the user asked to be cheap. Set
 * `EXPRESS_ANIMATIC_IMAGE_MODEL=pro` to move draft beats back without a
 * redeploy.
 */

export type AnimaticImageModelChoice = 'flash' | 'pro'

export function getExpressAnimaticImageModel(): AnimaticImageModelChoice {
  return process.env.EXPRESS_ANIMATIC_IMAGE_MODEL?.trim().toLowerCase() === 'pro'
    ? 'pro'
    : 'flash'
}

/**
 * Whether this request is a draft beat frame eligible for the flash tier.
 *
 * `animaticDraft` is still honoured because `generateSceneImage` reaches this
 * route over HTTP: an Express run already in flight on the previous deployment
 * can land on a new one, and ignoring its flag would push those beats to pro
 * mid-run.
 */
export function usesFlashDraftTier(args: {
  isBeatFrame: boolean
  resolvedModelTier?: string
  animaticDraft?: boolean
}): boolean {
  if (!args.isBeatFrame) return false
  if (args.resolvedModelTier !== 'eco' && !args.animaticDraft) return false
  return getExpressAnimaticImageModel() === 'flash'
}
