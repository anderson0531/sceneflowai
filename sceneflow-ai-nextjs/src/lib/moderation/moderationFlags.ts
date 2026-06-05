/**
 * Hive moderation feature flags.
 * HIVE_MODERATION_ENABLED enables the paid validation API only — no auto-run on generation routes.
 */

import type { ModerationStage } from './moderationPipeline'

/** Master switch — enables POST /api/moderation/validate only. */
export function isHiveModerationMasterEnabled(): boolean {
  return process.env.HIVE_MODERATION_ENABLED === 'true'
}

/** @deprecated Per-stage env flags are not used for auto-run. Validation API uses forceEnabled. */
export function isStageModerationEnabled(_stage: ModerationStage): boolean {
  return false
}

/** Generation routes never auto-moderate prompts. */
export function isPromptModerationEnabled(): boolean {
  return false
}

export function isValidationApiEnabled(): boolean {
  return isHiveModerationMasterEnabled()
}
