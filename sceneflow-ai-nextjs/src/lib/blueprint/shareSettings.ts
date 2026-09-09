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
