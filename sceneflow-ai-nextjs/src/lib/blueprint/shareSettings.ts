import type { BlueprintShareSettings } from './shareTypes'

/** Existing collab links default to feedback on. */
export function isBlueprintFeedbackAllowed(
  settings?: BlueprintShareSettings | null
): boolean {
  return settings?.allowFeedback !== false
}

export function isBlueprintNeverExpires(
  settings?: BlueprintShareSettings | null
): boolean {
  return settings?.neverExpires === true
}

/**
 * True when Customer revision rounds are configured and exhausted.
 */
export function isBlueprintRoundLimitReached(
  settings?: BlueprintShareSettings | null
): boolean {
  if (!settings) return false
  if (settings.approvalStatus === 'approved') return true
  if (typeof settings.maxFeedbackRounds !== 'number' || settings.maxFeedbackRounds < 0) {
    return false
  }
  const used = Number(settings.roundsUsed ?? 0)
  return used >= settings.maxFeedbackRounds
}

/**
 * Audience Resonance stays Producer-controlled by default on Client links.
 */
export function shouldHideBlueprintAudienceResonance(
  settings?: BlueprintShareSettings | null
): boolean {
  if (!settings) return false
  if (settings.hideAudienceResonance === true) return true
  if (settings.clientMode === true && settings.hideAudienceResonance !== false) {
    return true
  }
  return false
}
