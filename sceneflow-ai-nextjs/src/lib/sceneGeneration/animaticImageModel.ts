/**
 * Which Gemini image model backs Express animatic (draft) beat frames.
 *
 * Draft beats are storyboard coverage, not delivery frames. Flash is faster and
 * sits on a separate, larger quota than `gemini-3-pro-image`, whose ceiling was
 * failing beats outright even at image-lane concurrency 1.
 *
 * Only Express draft beats opt in — they are the sole caller that sends
 * `animaticDraft`. Final beats, dialogue frames, and the prompt builder keep the
 * pro model. Set `EXPRESS_ANIMATIC_IMAGE_MODEL=pro` to move draft beats back
 * without a redeploy.
 */

export type AnimaticImageModelChoice = 'flash' | 'pro'

export function getExpressAnimaticImageModel(): AnimaticImageModelChoice {
  return process.env.EXPRESS_ANIMATIC_IMAGE_MODEL?.trim().toLowerCase() === 'pro'
    ? 'pro'
    : 'flash'
}

/** Whether this request is an Express draft beat frame eligible for the flash tier. */
export function usesFlashAnimaticTier(args: {
  isBeatFrame: boolean
  animaticDraft?: boolean
}): boolean {
  if (!args.isBeatFrame || !args.animaticDraft) return false
  return getExpressAnimaticImageModel() === 'flash'
}
