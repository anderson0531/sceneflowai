/**
 * User moderation violation tracking — shared by KlingSafetyGuard and withHiveModeration.
 */

import User from '@/models/User'
import { HiveModerationService } from '@/services/HiveModerationService'
import { MODERATION_SAMPLING } from '@/lib/moderation/moderationSampling'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function recordUserModerationViolation(userId: string): Promise<void> {
  if (!UUID_RE.test(userId)) {
    console.log(`[Moderation] Skipping violation record for non-UUID userId: ${userId}`)
    return
  }

  try {
    const user = await User.findByPk(userId)
    if (!user) {
      console.warn(`[Moderation] User not found for violation record: ${userId}`)
      return
    }

    const now = new Date()
    const recentCount = await HiveModerationService.getUserViolationCount(
      userId,
      MODERATION_SAMPLING.violations.recentWindowHours
    )

    await user.update({
      moderation_violations_count: user.moderation_violations_count + 1,
      moderation_violations_recent: recentCount + 1,
      last_violation_at: now,
    })

    const { shouldSuspend, reason } = await HiveModerationService.checkUserSuspension(userId)

    if (shouldSuspend) {
      const suspendUntil = new Date(
        now.getTime() + MODERATION_SAMPLING.violations.suspensionDurationHours * 60 * 60 * 1000
      )
      await user.update({ moderation_suspended_until: suspendUntil })
      console.warn(
        `[Moderation] User ${userId} suspended until ${suspendUntil.toISOString()}: ${reason}`
      )
    } else {
      console.log(`[Moderation] User ${userId} violation count: ${recentCount + 1}`)
    }
  } catch (error) {
    console.error('[Moderation] Error recording user violation:', error)
  }
}
